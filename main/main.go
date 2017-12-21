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
	cb.AddFunction("/bus", cb.BusTimings)
	cb.AddFunction("/weather", cb.Weather)
	cb.AddFunction("/broadcast", cb.Broadcast)
	cb.AddFunction("/subscribe", cb.Subscribe)
	cb.AddFunction("/spaces", cb.Spaces)


	/**
	//Current problem: not retrieving user details properly.
	var user model.User
	db.First(&user) //add error handling
	log.Print(user)
	//For Error handling
	var sub model.User;
	log.Print("1")
	log.Print(db)
	log.Print(417297780)
	log.Print(user.UserId)
	check := db.Where("user_id = ?", user.UserId)
	check.First(&sub)
	log.Print("2")
	log.Print(sub)
	log.Print(db)
	//test := check.Where("last_name = ?", user.LastName).First(&sub).Error;
	*/


	updates := cb.Listen(60)

	for update := range updates {
		if update.Message != nil {
			modelMsg := model.FromTelegramMessage(*update.Message)
			env.db.Create(&modelMsg)
			cb.Router(*update.Message)
		}
	}

}


