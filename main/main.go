package main

import (
	"io/ioutil"
	"log"
	"os"

	_ "github.com/jinzhu/gorm/dialects/sqlite"
	"github.com/varunpatro/cinnabot"
	"github.com/varunpatro/cinnabot/model"
)

func main() {
	configJSON, err := ioutil.ReadFile("config.json")
	if err != nil {
		log.Fatalf("error reading config file! Boo: %s", err)
	}

	logger := log.New(os.Stdout, "[cinnabot] ", 0)

	cb := cinnabot.InitCinnabot(configJSON, logger)
	db := model.InitializeDB()

	//Junk functions
	cb.AddFunction("/echo", cb.Echo)
	cb.AddFunction("/hello", cb.SayHello)
	cb.AddFunction("/capitalize", cb.Capitalize)

	//Main functions
	cb.AddFunction("/start", cb.Start)
	cb.AddFunction("/about", cb.About)
	cb.AddFunction("/help", cb.Help)

	cb.AddFunction("/resources", cb.Resources)

	cb.AddFunction("/publicbus", cb.BusTimings)

	cb.AddFunction("/nusbus", cb.NUSBus)

	cb.AddFunction("/weather", cb.Weather)

	cb.AddFunction("/cbs", cb.CBS)
	cb.AddFunction("/broadcast", cb.Broadcast)
	cb.AddFunction("/subscribe", cb.Subscribe)
	cb.AddFunction("/unsubscribe", cb.Unsubscribe)

	cb.AddFunction("/spaces", cb.Spaces)

	cb.AddFunction("/feedback", cb.Feedback)
	cb.AddFunction("/cinnabotfeedback", cb.CinnabotFeedback)
	cb.AddFunction("/uscfeedback", cb.USCFeedback)
	cb.AddFunction("/diningfeedback", cb.DiningFeedback)
	cb.AddFunction("/residentialfeedback", cb.ResidentialFeedback)

	cb.AddFunction("/cancel", cb.Cancel)

	updates := cb.Listen(60)

	for update := range updates {
		if update.Message != nil {
			modelMsg, modelUsr := model.FromTelegramMessage(*update.Message)
			db.Add(&modelMsg)
			db.Add(&modelUsr)
			cb.Router(*update.Message)
		}
	}

}
