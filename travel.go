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
	if len(msg.Args) == 0 || !cb.CheckArgCmdPair("/publicbus", msg.Args) {
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
	//Asynchronous

	//Default loc: Cinnamon
	loc := &tgbotapi.Location{Latitude: CinnamonLat, Longitude: CinnamonLong}

	if msg.Location != nil {
		loc = msg.Location
	}
	//Returns a heap of busstop data (sorted)
	BSH := makeHeap(*loc)
	cb.SendTextMessage(int(msg.Chat.ID), busTimingResponse(&BSH))
	return
}

func makeHeap(loc tgbotapi.Location) BusStopHeap {
	responseData, _ := ioutil.ReadFile("publicstops.json")
	points := []BusStop{}
	if err := json.Unmarshal(responseData, &points); err != nil {
		log.Print(err)
	}
	BSH := BusStopHeap{points, loc}
	heap.Init(&BSH)
	return BSH
}

//busTimingResponse returns string given a busstopheap
func busTimingResponse(BSH *BusStopHeap) string {
	returnMessage := "🤖: Here are the timings:\n\n"
	//Iteratively get data for each closest bus stop.
	for i := 0; i < 4; i++ {

		busStop := heap.Pop(BSH).(BusStop)

		busStopCode := busStop.BusStopNumber

		returnMessage += "*" + busStop.BusStopName + "*\n"

		//Send request to my transport sg for bus timing data
		client := &http.Client{}

		req, _ := http.NewRequest("GET",
			"http://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode="+busStopCode, nil)
		req.Header.Set("AccountKey", "l88uTu9nRjSO6VYUUwilWg==")

		resp, _ := client.Do(req)
		responseData, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Print(err)
		}

		bt := BusTimes{}
		if err := json.Unmarshal(responseData, &bt); err != nil {
			log.Print(err)
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
	if len(msg.Args) == 0 || !cb.CheckArgCmdPair("/nusbus", msg.Args) {
		opt1 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("UTown"), tgbotapi.NewKeyboardButton("Science"))
		opt2 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Arts"), tgbotapi.NewKeyboardButton("Comp"))
		opt3 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("CenLib"), tgbotapi.NewKeyboardButton("Biz"))
		opt4 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Law"), tgbotapi.NewKeyboardButton("Yih/Engin"))
		opt5 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("MPSH"), tgbotapi.NewKeyboardButton("KR-MRT"))

		opt6B := tgbotapi.NewKeyboardButton("Here")
		opt6B.RequestLocation = true
		opt6 := tgbotapi.NewKeyboardButtonRow(opt6B)

		options := tgbotapi.NewReplyKeyboard(opt6, opt1, opt2, opt3, opt4, opt5)

		replyMsg := tgbotapi.NewMessage(int64(msg.Chat.ID), "🤖: Where are you?\n\n")
		replyMsg.ReplyMarkup = options
		cb.SendMessage(replyMsg)
		return
	}

	//Default loc: Cinnamon
	loc := &tgbotapi.Location{Latitude: CinnamonLat, Longitude: CinnamonLong}

	if msg.Location != nil {
		loc = msg.Location
		//Returns a heap of busstop data (sorted)
		BSH := makeNUSHeap(*loc)
		responseString := nusBusTimingResponse(&BSH)
		cb.SendTextMessage(int(msg.Chat.ID), responseString)
		return
	} else if msg.Args[0] == "utown" {
		cb.SendTextMessage(int(msg.Chat.ID), getBusTimings("UTOWN"))
		return
	} else if msg.Args[0] == "science" {
		cb.SendTextMessage(int(msg.Chat.ID), getBusTimings("S17")+"\n\n"+getBusTimings("LT29"))
		return
	} else if msg.Args[0] == "kr-mrt" {
		cb.SendTextMessage(int(msg.Chat.ID), getBusTimings("KR-MRT-OPP")+"\n\n"+getBusTimings("KR-MRT"))
		return
	} else if msg.Args[0] == "mpsh" {
		cb.SendTextMessage(int(msg.Chat.ID), getBusTimings("STAFFCLUB")+"\n\n"+getBusTimings("STAFFCLUB-OPP"))
		return
	} else if msg.Args[0] == "arts" {
		cb.SendTextMessage(int(msg.Chat.ID), getBusTimings("LT13-OPP")+"\n\n"+getBusTimings("LT13")+"\n\n"+getBusTimings("AS7"))
		return
	} else if msg.Args[0] == "yih/engin" {
		cb.SendTextMessage(int(msg.Chat.ID), getBusTimings("YIH-OPP")+"\n\n"+getBusTimings("YIH")+"\n\n"+getBusTimings("MUSEUM")+"\n\n"+getBusTimings("RAFFLES"))
		return
	} else if msg.Args[0] == "comp" {
		cb.SendTextMessage(int(msg.Chat.ID), getBusTimings("COM2"))
		return
	} else if msg.Args[0] == "biz" {
		cb.SendTextMessage(int(msg.Chat.ID), getBusTimings("HSSML-OPP")+"\n\n"+getBusTimings("BIZ2")+"\n\n"+getBusTimings("NUSS-OPP"))
		return
	} else if msg.Args[0] == "cenlib" {
		cb.SendTextMessage(int(msg.Chat.ID), getBusTimings("COMCEN")+"\n\n"+getBusTimings("CENLIB"))
		return
	} else if msg.Args[0] == "law" {
		cb.SendTextMessage(int(msg.Chat.ID), getBusTimings("BUKITTIMAH-BTC2"))
		return
	}
}

//makeNUSHeap returns a heap for NUS Bus timings
func makeNUSHeap(loc tgbotapi.Location) BusStopHeap {
	responseData, err := ioutil.ReadFile("nusstops.json")
	if err != nil {
		log.Print(err)
	}
	points := []BusStop{}
	if err := json.Unmarshal(responseData, &points); err != nil {
		log.Print(err)
	}
	BSH := BusStopHeap{points, loc}
	heap.Init(&BSH)
	return BSH
}

func getBusTimings(code string) string {
	returnMessage := "*" + code + "*\n"
	resp, _ := http.Get("https://nextbus.comfortdelgro.com.sg/eventservice.svc/Shuttleservice?busstopname=" + code)

	responseData, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Print(err)
	}
	var bt Response
	if err := json.Unmarshal(responseData, &bt); err != nil {
		log.Print(err)
	}
	for j := 0; j < len(bt.Result.Shuttles); j++ {
		arrivalTime := bt.Result.Shuttles[j].ArrivalTime

		if arrivalTime == "-" {
			returnMessage += "🛑" + bt.Result.Shuttles[j].Name + " : - mins\n"
			continue
		} else if arrivalTime == "Arr" {
			returnMessage += "🚍" + bt.Result.Shuttles[j].Name + " : " + arrivalTime + "\n"
			continue
		}

		returnMessage += "🚍" + bt.Result.Shuttles[j].Name + " : " + arrivalTime + " mins\n"
	}
	return returnMessage
}

func nusBusTimingResponse(BSH *BusStopHeap) string {
	returnMessage := "🤖: Here are the bus timings\n\n"
	for i := 0; i < 3; i++ {

		stop := heap.Pop(BSH).(BusStop)

		returnMessage += "*" + stop.BusStopName + "*\n"

		resp, _ := http.Get("https://nextbus.comfortdelgro.com.sg/eventservice.svc/Shuttleservice?busstopname=" + stop.BusStopNumber)

		responseData, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Print(err)
		}
		var bt Response
		if err := json.Unmarshal(responseData, &bt); err != nil {
			log.Print(err)
		}

		for j := 0; j < len(bt.Result.Shuttles); j++ {
			arrivalTime := bt.Result.Shuttles[j].ArrivalTime

			if arrivalTime == "-" {
				returnMessage += "🛑" + bt.Result.Shuttles[j].Name + " : - mins\n"
				continue
			} else if arrivalTime == "Arr" {
				returnMessage += "🚍" + bt.Result.Shuttles[j].Name + " : " + arrivalTime + "\n"
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
