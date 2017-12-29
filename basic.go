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

)

// SayHello says hi.
func (cb *Cinnabot) SayHello(msg *message) {
	cb.SendTextMessage(msg.From.ID, "Hello there, "+msg.From.FirstName+"!")
}

// Help gives a list of handles that the user may call along with a description of them
func (cb *Cinnabot) Help (msg *message) {
	text :=
		"🤖: Hello there " + msg.From.FirstName + "!\n" +
		"Here are a list of functions to get you started. (:. \n" +
		"/cbs: cinnamon broadcast system\n" +
		"/bus: public bus timings for bus stops around your location\n" +
		"/weather: 2h weather forecast\n" +
		"/link: list of important links!\n" +
		"/spaces: list of space bookings\n" +
		"/feedback: to give feedback"
	cb.SendTextMessage(msg.From.ID, text)
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
	links["usplife"] = "https://www.facebook.com/groups/usplife/"
	links["food"]="@rcmealbot"//Ideally, to the RC meal bot chat group

	var key string = strings.ToLower(strings.Join(msg.Args, " "))
	_,ok := links[key]
	if (ok) {
		cb.SendTextMessage(msg.From.ID, links[key])
	} else {
		var values string = ""
		for key,_ := range links {
			values += key + " : " + links[key] + "\n"
		}
		values = values[0:len(values)-2] //To remove last "\n"
		cb.SendTextMessage(msg.From.ID, "🤖: Here are the possible links:\n" + values)
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
	lowestDistance := distanceBetween(wf.AM[0].Loc, *msg.Location)
	nameMinLoc := wf.AM[0].Name
	for i := 1; i < len(wf.AM); i++ {
		currDistance := distanceBetween(wf.AM[i].Loc, *msg.Location)
		if currDistance < lowestDistance {
			lowestDistance = currDistance
			nameMinLoc = wf.AM[i].Name
		}
	}
	log.Print("The closest location is " + nameMinLoc)

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
func distanceBetween (Loc1 tgbotapi.Location, Loc2 tgbotapi.Location) float64 {
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
	responseString := busTimingResponse(&BSH)
	cb.SendTextMessage(msg.From.ID, responseString)
}

//Helper functions for BusTiming
func busTimingResponse (BSH *BusStopHeap) string{
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
		responseData, err := ioutil.ReadAll(resp.Body);
		if err!=nil {
			panic(err)
		}

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
	return distanceBetween2(h.location,h.busStopList[i]) < distanceBetween2(h.location, h.busStopList[j])
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

func distanceBetween2(Loc1 tgbotapi.Location, Loc2 BusStop) float64 {

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
		var checkedTags []string
		for i := 0; i < len(tags) ; i++ {
			if cb.db.CheckTagExists(msg.From.ID,tags[i]) {
				checkedTags = append(checkedTags, tags[i])
			}
		}

		//Send in mark-up
		replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "/broadcast " + strings.Join(checkedTags," "))
		replyMsg.BaseChat.ReplyToMessageID = msg.MessageID
		replyMsg.ReplyMarkup = tgbotapi.ForceReply{ForceReply: true, Selective: true}
		cb.SendMessage(replyMsg)
		return

	}


	//Tags to send to
	r := regexp.MustCompile(`\/\w*`)
	locReply := r.FindStringIndex(msg.ReplyToMessage.Text)
	tags := strings.Fields(msg.ReplyToMessage.Text[locReply[1]:])


	userGroup := cb.db.UserGroup(tags)

	//Forwards message to everyone in the group
	for j := 0; j < len(userGroup); j++ {
		forwardMess := 	tgbotapi.NewForward(int64(userGroup[j].UserID), msg.Chat.ID, msg.MessageID)
		cb.SendMessage(forwardMess)
	}

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

func (cb *Cinnabot) CBS (msg *message) {
	//Consider sending an image?
	listText := "🤖: Welcome to Cinnabot's Broadcasting System!(CBS)\n" +
		"These are the following commands that you can use:\n" +
		"\\subscribe <tag>: to subscribe to a tag\n" +
		"\\unsubcribe <tag>: to unsubscribe from a tag\n" +
		"These channels will be used by a small group of humans to disseminate important information according to tags.\n" +
		"List of tags:\n" +
		"everything, events"

	cb.SendTextMessage(msg.From.ID,listText)
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

	tag := msg.Args[0]
	log.Print("Tag: " + tag)


	//Check if tag exists.
	if !cb.db.CheckTagExists(msg.From.ID,tag) {
		cb.SendTextMessage(msg.From.ID, "🤖 Invalid tag")
		return
	}

	//Check if user is already subscribed to
	if cb.db.CheckSubscribed(msg.From.ID, tag) {
		cb.SendTextMessage(msg.From.ID, "🤖 You are already subscribed to " + tag)
		return
	}

	//Check if there are other errors
	if err := cb.db.UpdateTag(msg.From.ID, tag, "true"); err != nil{ //Need to try what happens someone updates user_id field.
		cb.SendTextMessage(msg.From.ID, "🤖 Oh no there is an error")
		log.Fatal(err.Error())
	}

	cb.SendTextMessage(msg.From.ID, "🤖 You are now subscribed to " + tag)
	return
}

//Unsubscribe unsubscribes the user from a broadcast channel [trial]
func (cb *Cinnabot) Unsubscribe (msg *message) {

	if len(msg.Args) == 0 {
		replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "/unsubscribe 🤖 What do you want to unsubscribe from?\n\n")
		replyMsg.BaseChat.ReplyToMessageID = msg.MessageID
		replyMsg.ReplyMarkup = tgbotapi.ForceReply{ForceReply: true, Selective: true}
		cb.SendMessage(replyMsg)
		return
	}

	tag := msg.Args[0]
	log.Print("Tag: " + tag)


	//Check if tag exists.
	if !cb.db.CheckTagExists(msg.From.ID,tag) {
		cb.SendTextMessage(msg.From.ID, "🤖 Invalid tag")
		return
	}

	//Check if user is already NOT subscribed to
	if !cb.db.CheckSubscribed(msg.From.ID, tag) {
		cb.SendTextMessage(msg.From.ID, "🤖 You are already not subscribed to " + tag)
		return
	}

	//Check if there are other errors
	if err := cb.db.UpdateTag(msg.From.ID, tag, "false"); err != nil{ //Need to try what happens someone updates user_id field.
		cb.SendTextMessage(msg.From.ID, "🤖 Oh no there is an error")
		log.Fatal(err.Error())
	}

	cb.SendTextMessage(msg.From.ID, "🤖 You are now unsubscribed from " + tag)
	return
}

//Feedback allows users an avenue to give feedback. Admins can retrieve by searching the /feedback handler in the db
func (cb *Cinnabot) Feedback (msg *message) {
	if len(msg.Args) == 0 {
		replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "/feedback 🤖: My owner would love your feedback\n\n")
		replyMsg.BaseChat.ReplyToMessageID = msg.MessageID
		replyMsg.ReplyMarkup = tgbotapi.ForceReply{ForceReply: true, Selective: true}
		cb.SendMessage(replyMsg)
		return
	}
	text := "🤖: Feedback received! I will now transmit feedback to owner\n\n " +
			"We really appreciate you taking the time out to submit feedback.\n" +
			"If its urgent you may contact my owner at @sean_npn. He would love to have coffee with you."
	cb.SendTextMessage(msg.From.ID, text)

}