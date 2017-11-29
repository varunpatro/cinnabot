package cinnabot

import (
	"strings"

	"gopkg.in/telegram-bot-api.v4"
)

// SayHello says hi.
func (cb *cinnabot) SayHello(msg *message) {
	cb.SendTextMessage(msg.From.ID, "Hello there, "+msg.From.FirstName+"!")
}

// Echo parrots back the argument given by the user.
func (cb *cinnabot) Echo(msg *message) {
	if len(msg.Args) == 0 {
		replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "/echo Cinnabot Parrot Mode 🤖\nWhat do you want me to parrot?\n\n")
		replyMsg.BaseChat.ReplyToMessageID = msg.MessageID
		replyMsg.ReplyMarkup = tgbotapi.ForceReply{true,true}
		cb.SendMessage(replyMsg)
		return
	}
	response := "🤖: " + strings.Join(msg.Args, " ")
	cb.SendTextMessage(msg.From.ID, response)
}


// Source returns a link to Jarvis's source code.
func (cb *cinnabot) About(msg *message) {
	cb.SendTextMessage(msg.From.ID, "Touch me: https://github.com/varunpatro/cinnabot")
}

func (cb *cinnabot) Capitalize(msg *message) {
	cb.SendTextMessage(msg.From.ID, strings.ToUpper(strings.Join(msg.Args," ")))
}

