package cinnabot

import (
	"log"
	"strconv"

	_ "github.com/jinzhu/gorm/dialects/sqlite"
	"github.com/patrickmn/go-cache"
	"gopkg.in/telegram-bot-api.v4"
)

func (cb *Cinnabot) CBS(msg *message) {

	if cb.CheckArgCmdPair("/cbs", msg.Args) {
		cb.cache.Set(strconv.Itoa(msg.From.ID), "/"+msg.Args[0], cache.DefaultExpiration)
		if msg.Args[0] == "subscribe" {
			cb.Subscribe(msg)
		} else {
			cb.Unsubscribe(msg)
		}
		return
	}

	opt1 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Subscribe"))
	opt2 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Unsubscribe"))
	options := tgbotapi.NewReplyKeyboard(opt1, opt2)

	listText := "🤖: The Cinnamon Broadcast System (CBS) is your one stop shop for information in USP! Subscribe to the tags you want to receive notifications about!\n" +
		"These are the following commands that you can use:\n" +
		"/subscribe : to subscribe to a tag\n" +
		"/unsubscribe : to unsubscribe from a tag\n\n" +
		"*Subscribe status*\n" + "(sub status) tag: description\n"
	if cb.db.CheckSubscribed(msg.From.ID, "everything") {
		for i := 0; i < len(cb.allTags); i += 2 {
			listText += "✅" + cb.allTags[i] + " : " + cb.allTags[i+1] + "\n"
		}
	} else {
		for i := 0; i < len(cb.allTags); i += 2 {
			if cb.db.CheckSubscribed(msg.From.ID, cb.allTags[i]) {
				listText += "✅" + cb.allTags[i] + " : " + cb.allTags[i+1] + "\n"
			} else {
				listText += "❎" + cb.allTags[i] + " : " + cb.allTags[i+1] + "\n"
			}
		}
	}
	newMsg := tgbotapi.NewMessage(msg.Chat.ID, listText)
	newMsg.ReplyMarkup = options
	newMsg.ParseMode = "markdown"
	cb.SendMessage(newMsg)
}

//Subscribe subscribes the user to a broadcast channel [trial]
func (cb *Cinnabot) Subscribe(msg *message) {
	if len(msg.Args) == 0 || !cb.CheckArgCmdPair("/subscribe", msg.Args) {

		var rowList [][]tgbotapi.KeyboardButton
		for i := 0; i < len(cb.allTags); i += 2 {
			if !cb.db.CheckSubscribed(msg.From.ID, cb.allTags[i]) {
				rowList = append(rowList, tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton(cb.allTags[i])))
			}
		}
		if len(rowList) == 0 {
			cb.SendTextMessage(int(msg.Chat.ID), "🤖: You are subscribed to everything :)")
			return
		}

		options := tgbotapi.NewReplyKeyboard(rowList...)
		replyMsg := tgbotapi.NewMessage(msg.Chat.ID, "🤖: What would you like to subscribe to?\n\n")
		replyMsg.ReplyMarkup = options
		cb.SendMessage(replyMsg)

		return
	}

	tag := msg.Args[0]
	log.Print("Tag: " + tag)

	//Check if tag exists.
	if !cb.db.CheckTagExists(msg.From.ID, tag) {
		cb.SendTextMessage(int(msg.Chat.ID), "🤖: Invalid tag")
		return
	}

	//Check if user is already subscribed to
	if cb.db.CheckSubscribed(msg.From.ID, tag) {
		cb.SendTextMessage(int(msg.Chat.ID), "🤖: You are already subscribed to "+tag)
		return
	}

	//Check if there are other errors
	if err := cb.db.UpdateTag(msg.From.ID, tag, "true"); err != nil { //Need to try what happens someone updates user_id field.
		cb.SendTextMessage(int(msg.Chat.ID), "🤖: Oh no there is an error")
		log.Fatal(err.Error())
		return
	}
	if tag == "everything" {
		for i := 0; i < len(cb.allTags); i += 2 {
			cb.db.UpdateTag(msg.From.ID, cb.allTags[i], "true")
		}
	}

	cb.SendTextMessage(int(msg.Chat.ID), "🤖: You are now subscribed to "+tag)
	return
}

//Unsubscribe unsubscribes the user from a broadcast channel [trial]
func (cb *Cinnabot) Unsubscribe(msg *message) {
	if len(msg.Args) == 0 || !cb.CheckArgCmdPair("/unsubscribe", msg.Args) {
		var rowList [][]tgbotapi.KeyboardButton
		for i := 0; i < len(cb.allTags); i += 2 {
			if cb.db.CheckSubscribed(msg.From.ID, cb.allTags[i]) {
				rowList = append(rowList, tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton(cb.allTags[i])))
			}
		}
		if len(rowList) == 0 {
			cb.SendTextMessage(int(msg.Chat.ID), "🤖: You are not subscribed to anything. :(")
			return
		}

		options := tgbotapi.NewReplyKeyboard(rowList...)
		replyMsg := tgbotapi.NewMessage(msg.Chat.ID, "🤖: What would you like to unsubscribe from?\n\n")
		replyMsg.ReplyMarkup = options
		cb.SendMessage(replyMsg)

		return
	}

	tag := msg.Args[0]
	log.Print("Tag: " + tag)

	//Check if tag exists.
	if !cb.db.CheckTagExists(msg.From.ID, tag) {
		cb.SendTextMessage(int(msg.Chat.ID), "🤖: Invalid tag")
		return
	}

	//Check if user is already NOT subscribed to
	if !cb.db.CheckSubscribed(msg.From.ID, tag) {
		cb.SendTextMessage(int(msg.Chat.ID), "🤖: You are already not subscribed to "+tag)
		return
	}

	//Check if there are other errors
	if err := cb.db.UpdateTag(msg.From.ID, tag, "false"); err != nil { //Need to try what happens someone updates user_id field.
		cb.SendTextMessage(int(msg.Chat.ID), "🤖: Oh no there is an error")
		log.Fatal(err.Error())
		return
	}
	if cb.db.CheckSubscribed(msg.From.ID, "everything") {
		cb.db.UpdateTag(msg.From.ID, "everything", "false")
	}
	if tag == "everything" {
		for i := 0; i < len(cb.allTags); i += 2 {
			cb.db.UpdateTag(msg.From.ID, cb.allTags[i], "false")
		}
	}

	cb.SendTextMessage(int(msg.Chat.ID), "🤖: You are now unsubscribed from "+tag)
	return
}
