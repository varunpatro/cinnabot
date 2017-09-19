package main

import (
	"io/ioutil"
	"log"
	"os"
	"time"

	"github.com/tucnak/telebot"
	"github.com/spikerheado1234/cinnabot"
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

	messages := make(chan telebot.Message)
	cb.Listen(messages, 1 * time.Second)

	for message := range messages {
		cb.Router(message)
	}
}
