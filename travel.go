package cinnabot

import (
	"container/heap"
	"encoding/json"
	"io/ioutil"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	_ "github.com/jinzhu/gorm/dialects/sqlite"
	"gopkg.in/telegram-bot-api.v4"
)

//Structs for BusTiming
type BusTimes struct {
	Services []Service `json:"Services"`
}

type Service struct {
	ServiceNum string  `json:"ServiceNo"`
	Next       NextBus `json:"NextBus"`
}

type NextBus struct {
	EstimatedArrival string `json:"EstimatedArrival"`
}

//BusTimings checks the bus timings based on given location
func (cb *Cinnabot) BusTimings(msg *message) {
	if len(msg.Args) == 0 || !CheckArgCmdPair("/bus", msg.Args) {
		opt1 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Cinnamon"))
		opt2B := tgbotapi.NewKeyboardButton("Here")
		opt2B.RequestLocation = true
		opt2 := tgbotapi.NewKeyboardButtonRow(opt2B)

		options := tgbotapi.NewReplyKeyboard(opt1, opt2)

		replyMsg := tgbotapi.NewMessage(msg.Chat.ID, "🤖: Where are you?\n\n")
		replyMsg.ReplyMarkup = options
		cb.SendMessage(replyMsg)
		return
	}
	//Default loc: Cinnamon
	loc := &tgbotapi.Location{Latitude: 1.306671, Longitude: 103.773556}

	if msg.Location != nil {
		loc = msg.Location
	}
	//Returns a heap of busstop data (sorted)
	BSH := makeHeap(*loc)
	replyMsg := tgbotapi.NewMessage(msg.Chat.ID, busTimingResponse(&BSH))
	replyMsg.ReplyMarkup = tgbotapi.NewRemoveKeyboard(true)
	cb.SendMessage(replyMsg)
	return
}

func makeHeap(loc tgbotapi.Location) BusStopHeap {
	resp, _ := http.Get("https://busrouter.sg/data/2/bus-stops.json")
	responseData, _ := ioutil.ReadAll(resp.Body)
	points := []BusStop{}
	if err := json.Unmarshal(responseData, &points); err != nil {
		panic(err)
	}
	BSH := BusStopHeap{points, loc}
	heap.Init(&BSH)
	return BSH
}

//busTimingResponse returns string given a busstopheap
func busTimingResponse(BSH *BusStopHeap) string {
	returnMessage := "🤖: Here are the timings:\n"
	//Iteratively get data for each closest bus stop.
	for i := 0; i < 4; i++ {

		busStop := heap.Pop(BSH).(BusStop)

		busStopCode := busStop.BusStopNumber

		returnMessage += busStop.BusStopName + "\n================\n"

		//Send request to my transport sg for bus timing data
		client := &http.Client{}

		req, _ := http.NewRequest("GET",
			"http://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode="+busStopCode, nil)
		req.Header.Set("AccountKey", "l88uTu9nRjSO6VYUUwilWg==")

		resp, _ := client.Do(req)
		responseData, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Fatal(err)
		}

		bt := BusTimes{}
		if err := json.Unmarshal(responseData, &bt); err != nil {
			log.Fatal(err)
		}
		for j := 0; j < len(bt.Services); j++ {
			arrivalTime := bt.Services[j].Next.EstimatedArrival

			layout := "2006-01-02T15:04:05-07:00"
			t, _ := time.Parse(layout, arrivalTime)
			duration := int(t.Sub(time.Now()).Minutes())
			returnMessage += "🚍Bus " + bt.Services[j].ServiceNum + " : " + strconv.Itoa(duration+1) + " minutes\n"
		}
		returnMessage += "\n"
	}
	return returnMessage
}

//NUSBusTimes structs for unmarshalling
type Response struct {
	Result ServiceResult `json:"ShuttleServiceResult"`
}
type ServiceResult struct {
	Shuttles []Shuttle `json:"shuttles"`
}

type Shuttle struct {
	ArrivalTime string `json:"arrivalTime"`
	Name        string `json:"name"`
}

//NUSBus retrieves the next timing for NUS Shuttle buses
func (cb *Cinnabot) NUSBus(msg *message) {
	//If no args in nusbus and arg not relevant to bus
	if len(msg.Args) == 0 || !CheckArgCmdPair("/bus", msg.Args) {
		opt1 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Cinnamon"))
		opt2B := tgbotapi.NewKeyboardButton("Here")
		opt2B.RequestLocation = true
		opt2 := tgbotapi.NewKeyboardButtonRow(opt2B)

		options := tgbotapi.NewReplyKeyboard(opt1, opt2)

		replyMsg := tgbotapi.NewMessage(int64(msg.Chat.ID), "🤖: Where are you?\n\n")
		replyMsg.ReplyMarkup = options
		cb.SendMessage(replyMsg)
		return
	}

	//Default loc: Cinnamon
	loc := &tgbotapi.Location{Latitude: 1.306671, Longitude: 103.773556}

	if msg.Location != nil {
		loc = msg.Location
	}
	//Returns a heap of busstop data (sorted)
	BSH := makeNUSHeap(*loc)
	responseString := nusBusTimingResponse(&BSH)
	returnMsg := tgbotapi.NewMessage(msg.Chat.ID, responseString)
	returnMsg.ParseMode = "Markdown"
	returnMsg.ReplyMarkup = tgbotapi.NewRemoveKeyboard(true)
	cb.SendMessage(returnMsg)
}

//makeNUSHeap returns a heap for NUS Bus timings
func makeNUSHeap(loc tgbotapi.Location) BusStopHeap {
	responseData, err := ioutil.ReadFile("nusstops.json")
	if err != nil {
		log.Fatal(err)
	}
	points := []BusStop{}
	if err := json.Unmarshal(responseData, &points); err != nil {
		panic(err)
	}
	BSH := BusStopHeap{points, loc}
	heap.Init(&BSH)
	return BSH
}

func nusBusTimingResponse(BSH *BusStopHeap) string {
	returnMessage := "🤖: Here are the bus timings\n\n"
	for i := 0; i < 3; i++ {

		stop := heap.Pop(BSH).(BusStop)

		returnMessage += "*" + stop.BusStopName + "*\n"

		resp, _ := http.Get("https://nextbus.comfortdelgro.com.sg/eventservice.svc/Shuttleservice?busstopname=" + stop.BusStopNumber)

		responseData, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Fatal(err)
		}
		var bt Response
		if err := json.Unmarshal(responseData, &bt); err != nil {
			log.Fatal(err)
		}
		/**

				var min int
				var at string
				for j := 0; j < len(bt.Result.Shuttles); j++ {
					min = j
					for k := j; k < len(bt.Result.Shuttles); k++ {
						at = bt.Result.Shuttles[k].ArrivalTime
						log.Print(at, bt.Result.Shuttles[k].Name)

						if at == "-" {
							continue
						} else if at == "Arr" {
							min = k
							continue
						}

						val := strings.Compare(at, bt.Result.Shuttles[min].ArrivalTime)
						if val == -1 {
							log.Print("A")
							min = k
						}
					}
					bt.Result.Shuttles[j], bt.Result.Shuttles[min] = bt.Result.Shuttles[min], bt.Result.Shuttles[j]
				}
		        **/

		for j := 0; j < len(bt.Result.Shuttles); j++ {
			arrivalTime := bt.Result.Shuttles[j].ArrivalTime

			if arrivalTime == "-" {
				returnMessage += "🛑" + bt.Result.Shuttles[j].Name + " : - mins\n"
				continue
			}

			returnMessage += "🚍" + bt.Result.Shuttles[j].Name + " : " + arrivalTime + " mins\n"
		}
		returnMessage += "\n"
	}
	return returnMessage
}

//Bus stop structs
type BusStop struct {
	BusStopNumber string `json:"no"`
	Latitude      string `json:"lat"`
	Longitude     string `json:"lng"`
	BusStopName   string `json:"name"`
}

type BusStopHeap struct {
	busStopList []BusStop
	location    tgbotapi.Location
}

func (h BusStopHeap) Len() int {
	return len(h.busStopList)
}

func (h BusStopHeap) Less(i, j int) bool {
	return distanceBetween2(h.location, h.busStopList[i]) < distanceBetween2(h.location, h.busStopList[j])
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
	h.busStopList = oldh[0 : n-1]

	return x
}

func distanceBetween2(Loc1 tgbotapi.Location, Loc2 BusStop) float64 {

	loc2Lat, _ := strconv.ParseFloat(Loc2.Latitude, 32)
	loc2Lon, _ := strconv.ParseFloat(Loc2.Longitude, 32)

	x := math.Pow(Loc1.Latitude-loc2Lat, 2)
	y := math.Pow(Loc1.Longitude-loc2Lon, 2)
	return x + y
}
