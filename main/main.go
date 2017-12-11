package main

import (
	"io/ioutil"
	"log"
	"os"

	"github.com/jinzhu/gorm"
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

	db := initializeDB()
	defer db.Close()

	cb := cinnabot.InitCinnabot(configJSON, logger)

	cb.AddFunction("/about", cb.About)
	cb.AddFunction("/echo", cb.Echo)
	cb.AddFunction("/hello", cb.SayHello)
	cb.AddFunction("/capitalize", cb.Capitalize)
	cb.AddFunction("/bus", cb.BusTimings)
	cb.AddFunction("/weather", cb.Weather)

	updates := cb.Listen(60)

	for update := range updates {
		if update.Message != nil {
			modelMsg, modelUsr := model.FromTelegramMessage(*update.Message)
			db.Create(&modelMsg)
			if db.NewRecord(&modelUsr) {
				//log.Println(db.NewRecord(&modelUsr))
				db.Create(&modelUsr)
			}
			//log.Println(db.NewRecord(&modelUsr))
			cb.Router(*update.Message)
		}
	}
}

func initializeDB() *gorm.DB {
	db, err := gorm.Open("sqlite3", "./cinnabot.db")

	if err != nil {
		log.Fatalf("error in initializing db %s", err)
	}

	if !db.HasTable(&model.Message{}) {
		db.CreateTable(&model.Message{})
	}

	if !db.HasTable(&model.User{}) {
		db.CreateTable(&model.User{})
	}

	return db
}
