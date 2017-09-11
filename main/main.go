package main

import (
	"io/ioutil"
	"log"
	"os"
	"time"

	"github.com/tucnak/telebot"
	"github.com/varunpatro/cinnabot"
)

func main() {
	configJSON, err := ioutil.ReadFile("config.json")
	if err != nil {
		log.Fatalf("error reading config file! Boo: %s", err)
	}

	logger := log.New(os.Stdout, "[cinnabot] ", 0)

	cb := cinnabot.InitCinnaBot(configJSON, logger)

	cb.AddFunction("/echo", cb.Echo)
	cb.AddFunction("/about", cb.About)

	messages := make(chan telebot.Message)
	cb.Listen(messages, 1 * time.Second)

	for message := range messages {
		cb.Router(message)
	}
}
