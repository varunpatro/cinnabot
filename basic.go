package cinnabot

import (
	"strings"
	"net/http"

	_ "github.com/jinzhu/gorm/dialects/sqlite"
	"gopkg.in/telegram-bot-api.v4"
	"io/ioutil"
	"encoding/json"
	"container/heap"
	"strconv"
	"math"
	"log"
	"fmt"
	"time"
	"regexp"
	"github.com/varunpatro/cinnabot/model"
	"github.com/jinzhu/gorm"
)

// SayHello says hi.
func (cb *Cinnabot) SayHello(msg *message) {
	cb.SendTextMessage(msg.From.ID, "Hello there, "+msg.From.FirstName+"!")
}

// Echo parrots back the argument given by the user.
func (cb *Cinnabot) Echo(msg *message) {
	if len(msg.Args) == 0 {
		replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "/echo Cinnabot Parrot Mode 🤖\nWhat do you want me to parrot?\n\n")
		replyMsg.BaseChat.ReplyToMessageID = msg.MessageID
		replyMsg.ReplyMarkup = tgbotapi.ForceReply{ForceReply: true, Selective: true}
		cb.SendMessage(replyMsg)
		return
	}
	response := "🤖: " + strings.Join(msg.Args, " ")
	cb.SendTextMessage(msg.From.ID, response)
}

// About returns a link to Cinnabot's source code.
func (cb *Cinnabot) About(msg *message) {
	cb.SendTextMessage(msg.From.ID, "Touch me: https://github.com/varunpatro/Cinnabot")
}

// Capitalize returns a capitalized form of the input string.
func (cb *Cinnabot) Capitalize(msg *message) {
	cb.SendTextMessage(msg.From.ID, strings.ToUpper(strings.Join(msg.Args, " ")))
}

//Link returns useful links
func (cb *Cinnabot) Link(msg *message) {
	links := make(map[string]string)
	links["usplife"] = "https://www.facebook.com"
	links["food"]="https://www.google.com/food"//Ideally, to the RC meal bot chat group

	var key string = strings.ToLower(strings.Join(msg.Args, " "))
	_,ok := links[key]
	if (ok) {
		cb.SendTextMessage(msg.From.ID, links[key])
	} else {
		var possible_keys string = ""
		for key,_ := range links {
			possible_keys += key
			possible_keys += ", "
		}
		possible_keys = possible_keys[0:len(possible_keys)-2]
		cb.SendTextMessage(msg.From.ID, "Here are the possible links:\n" + possible_keys)
	}
}

//Structs for weather forecast function
type WeatherForecast struct {
	AM []AreaMetadata `json:"area_metadata"`
	FD []ForecastData `json:"items"`
}

type AreaMetadata struct {
	Name string `json:"name"`
	Loc tgbotapi.Location `json:"label_location"`
}

type ForecastData struct {
	FMD []ForecastMetadata `json:"forecasts"`
}

type ForecastMetadata struct {
	Name string `json:"area"`
	Forecast string `json:"forecast"`
}

//Weather checks the weather based on given location
func (cb *Cinnabot) Weather(msg *message){
	//Check if weather was sent with location, if not reply with markup
	if msg.Location == nil {
		replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "/weather Please send your location\n\n")
		replyMsg.BaseChat.ReplyToMessageID = msg.MessageID
		replyMsg.ReplyMarkup = tgbotapi.ForceReply{ForceReply: true, Selective: true}
		cb.SendMessage(replyMsg)
		return

	}

	//Send request to api.data.gov.sg for weather data
	client := &http.Client {}

	req, _ := http.NewRequest("GET", "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast", nil)
	req.Header.Set("api-key","d1Y8YtThOpkE5QUfQZmvuA3ktrHa1uWP")

	resp,_ := client.Do(req)
	responseData,_ := ioutil.ReadAll(resp.Body)

	wf := WeatherForecast{}
	if err := json.Unmarshal(responseData, &wf); err != nil {
		panic(err)
	}

	log.Print(msg.Location)
	lowestDistance := DistanceBetween(wf.AM[0].Loc, *msg.Location)
	nameMinLoc := wf.AM[0].Name
	for i := 1; i < len(wf.AM); i++ {
		currDistance := DistanceBetween(wf.AM[i].Loc, *msg.Location)
		if currDistance < lowestDistance {
			lowestDistance = currDistance
			nameMinLoc = wf.AM[i].Name
		}
	}
	log.Print("🤖 The closest location is " + nameMinLoc)

	var forecast string
	for i,_ := range wf.FD[0].FMD {
		if wf.FD[0].FMD[i].Name == nameMinLoc {
			forecast = wf.FD[0].FMD[i].Forecast
			break
		}
	}

	//Parsing forecast
	words := strings.Fields(forecast)
	forecast = strings.ToLower(strings.Join(words[:len(words)-1], " "))


	cb.SendTextMessage(msg.From.ID, "🤖 The forecast is " + forecast + " for " + nameMinLoc)

}

//Helper funcs for weather
func DistanceBetween (Loc1 tgbotapi.Location, Loc2 tgbotapi.Location) float64 {
	x := math.Pow((float64(Loc1.Latitude - Loc2.Latitude)),2)
	y := math.Pow((float64(Loc1.Longitude-Loc2.Longitude)),2)
	return x+y
}


//Structs for BusTiming
type BusTimes struct {
	Services []Service `json:"Services"`
}

type Service struct {
	ServiceNum string `json:"ServiceNo"`
	Next NextBus `json:"NextBus"`
}


type NextBus struct {
	EstimatedArrival string `json:"EstimatedArrival"`
}

//BusTimings checks the bus timings based on given location
func (cb *Cinnabot) BusTimings (msg *message) {
	//Check if weather was sent with location, if not reply with markup
	if msg.Location == nil {
		replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "/bus Please send your location\n\n")
		replyMsg.BaseChat.ReplyToMessageID = msg.MessageID
		replyMsg.ReplyMarkup = tgbotapi.ForceReply{ForceReply: true, Selective: true}
		cb.SendMessage(replyMsg)
		return
	}

	//Returns a heap of busstop data (sorted)
	BSH := getBusStops(*msg.Location)
	responseString := BusTimingResponse(&BSH)
	cb.SendTextMessage(msg.From.ID, responseString)
}

//Helper functions for BusTiming
func BusTimingResponse (BSH *BusStopHeap) string{
	returnMessage := ""
	//Iteratively get data for each closest bus stop.
	for i := 0; i < 3; i++ {
		busStop := heap.Pop(BSH).(BusStop)

		fmt.Println(busStop)
		busStopCode := busStop.BusStopNumber


		returnMessage += busStop.BusStopName+"\n================\n"

		//Send request to my transport sg for bus timing data
		client := &http.Client{}

		req, _ := http.NewRequest("GET",
			"http://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode="+busStopCode, nil)
		req.Header.Set("AccountKey", "l88uTu9nRjSO6VYUUwilWg==")

		resp, _ := client.Do(req)
		responseData, _ := ioutil.ReadAll(resp.Body)

		bt := BusTimes{}
		if err := json.Unmarshal(responseData, &bt); err != nil {
			panic(err)
		}
		for j:= 0; j < len(bt.Services); j++ {
			arrivalTime := bt.Services[j].Next.EstimatedArrival

			layout := "2006-01-02T15:04:05-07:00"
			t, _ := time.Parse(layout, arrivalTime)
			duration := int(t.Sub(time.Now()).Minutes())
			returnMessage += "Bus " + bt.Services[j].ServiceNum + " : " + strconv.Itoa(duration) + " minutes\n"
		}


		returnMessage += "\n"

	}


	return returnMessage
}

//Bus stop structs
type BusStop struct {
	BusStopNumber string `json:"no"`
	Latitude string `json:"lat"`
	Longitude string `json:"lng"`
	BusStopName string `json:"name"`
}

type BusStopHeap struct {
	busStopList []BusStop
	location tgbotapi.Location
}

func (h BusStopHeap) Len() int {
	return len(h.busStopList)
}

func (h BusStopHeap) Less(i, j int) bool {
	return DistanceBetween2(h.location,h.busStopList[i]) < DistanceBetween2(h.location, h.busStopList[j])
}

func (h BusStopHeap) Swap(i, j int) {
	h.busStopList[i], h.busStopList[j] = h.busStopList[j], h.busStopList[i]
}

func (h *BusStopHeap) Push(x interface{}) {
	h.busStopList = append(h.busStopList, x.(BusStop))
}

func (h *BusStopHeap) Pop() interface{} {
	oldh := h.busStopList
	n := len(oldh)
	x := oldh[n-1]
	h.busStopList = oldh[0:n-1]
	return x
}


func getBusStops(loc tgbotapi.Location) BusStopHeap {
	//Send request to api.data.gov.sg for bus stops data
	resp,_ := http.Get("https://busrouter.sg/data/2/bus-stops.json")
	responseData,_ := ioutil.ReadAll(resp.Body)

	points := []BusStop{}

	if err := json.Unmarshal(responseData, &points); err != nil {
		panic(err)
	}


	BSH := BusStopHeap{points,loc}

	heap.Init(&BSH)


	return BSH
}

func DistanceBetween2 (Loc1 tgbotapi.Location, Loc2 BusStop) float64 {

	loc2Lat,_:=strconv.ParseFloat(Loc2.Latitude,32)
	loc2Lon,_:=strconv.ParseFloat(Loc2.Longitude,32)

	x := math.Pow(Loc1.Latitude - loc2Lat,2)
	y := math.Pow(Loc1.Longitude - loc2Lon,2)
	return x+y
}


//Broadcast broadcasts a message after checking for admin status [trial]
//Admins are to first send a message with tags before sending actual message
func (cb *Cinnabot) Broadcast (msg *message) {
	val := checkAdmin(cb,msg)
	if !val {
		cb.SendTextMessage(msg.From.ID, "🤖 Im sorry! You do not seem to be an admin")
		return
	}

	if len(msg.Args) == 0 {
		cb.SendTextMessage(msg.From.ID, "🤖 Please include text in the message")
		return
	}
	//Used to initialize tags in a mark-up. Ensure that people check their tags
	if msg.ReplyToMessage == nil {
		//Scan for tags
		r := regexp.MustCompile(`\/\w*`)
		locReply := r.FindStringIndex(msg.Text)
		tags := strings.Fields(strings.ToLower(msg.Text[locReply[1]:]))

		//Filter for valid tags
		check := model.InitializeDB()
		var sub model.User
		var checkedTags []string
		for i := 0; i < len(tags) ; i++ {
			if err := check.Where(tags[i]+" = ?", "placebo").First(&sub).Error; err != gorm.ErrRecordNotFound {
				continue
			}
			checkedTags = append(checkedTags, tags[i])
		}

		//Send in mark-up
		replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "/broadcast " + strings.Join(checkedTags," "))
		replyMsg.BaseChat.ReplyToMessageID = msg.MessageID
		replyMsg.ReplyMarkup = tgbotapi.ForceReply{ForceReply: true, Selective: true}
		cb.SendMessage(replyMsg)
		return

	}
	//Initialize DB
	db := model.InitializeDB()
	defer db.Close()


	//Tags to send to
	r := regexp.MustCompile(`\/\w*`)
	locReply := r.FindStringIndex(msg.ReplyToMessage.Text)
	tags := strings.Fields(msg.ReplyToMessage.Text[locReply[1]:])


	log.Print("1")
	userGroup := db.UserGroup(tags)
	log.Print("2")
	log.Print(tags)
	log.Print(len(userGroup))
	log.Print(msg.Chat.ID)
	log.Print(msg.From.ID)
	//Consider forwarding the message instead [using forward config]
	for j := 0; j < len(userGroup); j++ {
		forwardMess := 	tgbotapi.NewForward(int64(userGroup[j].UserID), msg.Chat.ID, msg.MessageID)
		cb.SendMessage(forwardMess)
	}

	log.Print("3")
	return
}






func checkAdmin (cb *Cinnabot, msg *message) bool{
	for _,admin := range cb.keys.Admins {
		if admin == msg.From.ID {
			return true
		}
	}
	return false
}

//Subscribe subscribes the user to a broadcast channel [trial]
func (cb *Cinnabot) Subscribe (msg *message) {

	if len(msg.Args) == 0 {
		replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "/subscribe 🤖 What do you want to subscribe to?\n\n")
		replyMsg.BaseChat.ReplyToMessageID = msg.MessageID
		replyMsg.ReplyMarkup = tgbotapi.ForceReply{ForceReply: true, Selective: true}
		cb.SendMessage(replyMsg)
		return
	}

	db := model.InitializeDB()
	tag := msg.Args[0]
	log.Print("Tag: " + tag)

	var user model.User

	db.First(&user) //add error handling
	log.Print(user)
	//For Error handling
	//Only way to check aside from direct SQL query

	var sub model.User;
	check := db.Where("user_id = ?", msg.From.ID)

	//Check if tag exists.
	//Placebo used as a placebo value. no such column error thrown if does not exist.
	if err2 := check.Where(tag+" = ?", "placebo").First(&sub).Error; err2 != gorm.ErrRecordNotFound {
		if strings.Contains(err2.Error(), "no such column") {
			cb.SendTextMessage(msg.From.ID, "🤖 Invalid tag")
			return
		}

		cb.SendTextMessage(msg.From.ID,"🤖 UnknownError")
		log.Fatal(err2)

	}


	if err1 := check.Where(tag + " = ?", true).First(&sub).Error; err1 != gorm.ErrRecordNotFound {
		cb.SendTextMessage(msg.From.ID, "🤖 You are already subscribed to " + tag)
		return
	}

	log.Print(user)
	if err1 := check.Model(&user).Update(tag, true).Error; err1 != nil { //Need to try what happens someone updates user_id field.
		log.Fatal(err1.Error())
	}

	cb.SendTextMessage(msg.From.ID, "🤖 You are now subscribed to " + tag)
	return
}


