package cinnabot

import (
	"github.com/tucnak/telebot"
)

// SayHello says hi.
func (j *CinnaBot) SayHello(msg *message) {
	j.SendMessage(msg.Chat, "Hello there, " + msg.Sender.FirstName + "!", nil)
}

// Echo parrots back the argument given by the user.
func (j *CinnaBot) Echo(msg *message) {
	if len(msg.Args) == 0 {
		so := &telebot.SendOptions{ReplyTo: *msg.Message, ReplyMarkup: telebot.ReplyMarkup{ForceReply: true, Selective: true}}
		j.SendMessage(msg.Chat, "/echo Cinnabot Parrot Mode 🤖\nWhat do you want me to parrot?\n\n", so)
		return
	}
	response := "🤖: "
	for _, s := range msg.Args {
		response = response + s + " "
	}
	j.SendMessage(msg.Chat, response, nil)
}

// Source returns a link to Jarvis's source code.
func (j *CinnaBot) About(msg *message) {
	j.SendMessage(msg.Chat, "Touch me: https://github.com/varunpatro/cinnabot", nil)
}