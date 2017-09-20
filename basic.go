//Contains cinnabot functions
package cinnabot

import (
	"strings"

	"github.com/tucnak/telebot"
)

// SayHello says hi.
func (cb *cinnabot) SayHello(msg *message) {
	cb.SendMessage(msg.Chat, "Hello there, "+msg.Sender.FirstName+"!", nil)
}

// Echo parrots back the argument given by the user.
func (cb *cinnabot) Echo(msg *message) {
	if len(msg.Args) == 0 {
		so := &telebot.SendOptions{ReplyTo: *msg.Message, ReplyMarkup: telebot.ReplyMarkup{ForceReply: true, Selective: true}}
		cb.SendMessage(msg.Chat, "/echo Cinnabot Parrot Mode 🤖\nWhat do you want me to parrot?\n\n", so)
		return
	}
	response := "🤖: " + strings.Join(msg.Args, " ")
	cb.SendMessage(msg.Chat, response, nil)
}

// Source returns a link to Jarvis's source code.
func (cb *cinnabot) About(msg *message) {
	cb.SendMessage(msg.Chat, "Touch me: https://github.com/varunpatro/cinnabot", nil)
}

func (cb *cinnabot) Capitalise(msg *message) {
	response := "🤖: " + strings.Join(msg.Args, " ")
	response = strings.ToUpper(response)
	cb.SendMessage(msg.Chat, response, nil)
}
