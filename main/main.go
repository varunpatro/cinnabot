package main

import (
	"io/ioutil"
	"log"
	"os"

	_ "github.com/jinzhu/gorm/dialects/sqlite"
	"github.com/varunpatro/cinnabot"
	"github.com/varunpatro/cinnabot/model"
)

type Env struct { //Consider removing as database is the only dependency is needed.
	db *model.Database
}

func main() {
	configJSON, err := ioutil.ReadFile("config.json")
	if err != nil {
		log.Fatalf("error reading config file! Boo: %s", err)
	}

	logger := log.New(os.Stdout, "[cinnabot] ", 0)

	cb := cinnabot.InitCinnabot(configJSON, logger)
	db := model.InitializeDB()
	env := &Env{db}


	cb.AddFunction("/about", cb.About)
	cb.AddFunction("/echo", cb.Echo)
	cb.AddFunction("/hello", cb.SayHello)
	cb.AddFunction("/capitalize", cb.Capitalize)
	cb.AddFunction("/link", cb.Link)
	cb.AddFunction("/bus", cb.BusTimings)
	cb.AddFunction("/weather", cb.Weather)
	cb.AddFunction("/broadcast", cb.Broadcast)
	cb.AddFunction("/subscribe", cb.Subscribe)
	cb.AddFunction("/spaces", cb.Spaces)



	updates := cb.Listen(60)

	for update := range updates {
		if update.Message != nil {
			modelMsg := model.FromTelegramMessage(*update.Message)
			env.db.Add(&modelMsg)
			cb.Router(*update.Message)
		}
	}

}


