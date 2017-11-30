package main

import (
	"io/ioutil"
	"log"
	"os"

	"github.com/varunpatro/cinnabot"
)

func main() {
	configJSON, err := ioutil.ReadFile("config.json")
	if err != nil {
		log.Fatalf("error reading config file! Boo: %s", err)
	}

	logger := log.New(os.Stdout, "[cinnabot] ", 0)

	cb := cinnabot.InitCinnabot(configJSON, logger)

	cb.AddFunction("/about", cb.About)
	cb.AddFunction("/echo", cb.Echo)
	cb.AddFunction("/hello", cb.SayHello)
	cb.AddFunction("/capitalize", cb.Capitalize)

	updates := cb.Listen(60)

	for update := range updates {
		if update.Message != nil {
			cb.Router(*update.Message)
		}
	}
}
