package cinnabot

import (
	"log"
	"strconv"

	"github.com/patrickmn/go-cache"
	"github.com/pengnam/cinnabot/model"
	"gopkg.in/telegram-bot-api.v4"
)

//The different feedback functions are broken to four different functions so that responses can be easily personalised.

//Feedback allows users an avenue to give feedback. Admins can retrieve by searching the /feedback handler in the db
func (cb *Cinnabot) Feedback(msg *message) {
	if cb.CheckArgCmdPair("/feedback", msg.Args) {
		//Set Cache
		log.Print(msg.Args[0])
		key := msg.Args[0]
		if msg.Args[0] == "general(usc)" {
			key = "usc"
		}
		cb.cache.Set(strconv.Itoa(msg.From.ID), "/"+key+"feedback", cache.DefaultExpiration)
		text := ""
		if key == "usc" {
			text = "This feedback will be sent to the University Scholars Club. Please send your message."
		} else if key == "dining" {
			text = "This feedback will be sent to the Dining Hall Committee. Please send your message. \n(Indicate which stall you ate and whether it was Breakfast or Dinner)"
		} else if key == "residential" {
			text = "This feedback will be sent to the Residential Assistants. Please send your message."
		} else if key == "cinnabot" {
			text = "This feedback will be sent to USDevs, the developers of CinnaBot. Please send your message."
		} else if key == "ohs" {
			text = "[OHS Feedback](https://bit.ly/faultycinnamon)"
		}
		cb.SendTextMessage(msg.Message.From.ID, text)

		//Sets cache to the corresponding feedback
		return
	}
	opt1 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Cinnabot"))
	opt2 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("General(USC)"))
	opt3 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Dining"))
	opt4 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Residential"))
	opt5 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("OHS"))

	options := tgbotapi.NewReplyKeyboard(opt2, opt3, opt4, opt1, opt5)

	replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "🤖: What will you like to give feedback to?\nUse /cancel if you chicken out.")
	replyMsg.ReplyMarkup = options
	cb.SendMessage(replyMsg)

	return
}

func (cb *Cinnabot) CinnabotFeedback(msg *message) {
	cb.cache.Set(strconv.Itoa(msg.From.ID), "", cache.DefaultExpiration)

	text := "🤖: Feedback received! I will now transmit feedback to USDevs\n\n " +
		"We really appreciate you taking the time out to submit feedback.\n" +
		"If you want to you may contact my owner at @sean_npn. He would love to have coffee with you."

	cb.SendTextMessage(int(msg.Chat.ID), text)
	forwardMess := tgbotapi.NewForward(-315255349, msg.Chat.ID, msg.MessageID)
	cb.SendMessage(forwardMess)
	return
}

func (cb *Cinnabot) USCFeedback(msg *message) {
	cb.cache.Set(strconv.Itoa(msg.From.ID), "", cache.DefaultExpiration)
	text := "🤖: Feedback received! I will now transmit feedback to USC\n\n " +
		"We really appreciate you taking the time out to submit feedback.\n"
	cb.SendTextMessage(int(msg.Chat.ID), text)
	forwardMess := tgbotapi.NewForward(-218198924, msg.Chat.ID, msg.MessageID)
	cb.SendMessage(forwardMess)
	return
}

func (cb *Cinnabot) DiningFeedback(msg *message) {
	cb.cache.Set(strconv.Itoa(msg.From.ID), "", cache.DefaultExpiration)

	text := "🤖: Feedback received! I will now transmit feedback to dining hall committeel\n\n " +
		"We really appreciate you taking the time out to submit feedback.\n"
	cb.SendTextMessage(int(msg.Chat.ID), text)
	forwardMess := tgbotapi.NewForward(-295443996, msg.Chat.ID, msg.MessageID)
	cb.SendMessage(forwardMess)
	return
}

func (cb *Cinnabot) ResidentialFeedback(msg *message) {
	cb.cache.Set(strconv.Itoa(msg.From.ID), "", cache.DefaultExpiration)

	text := "🤖: Feedback received! I will now transmit feedback to the residential committeel\n\n " +
		"We really appreciate you taking the time out to submit feedback.\n"
	cb.SendTextMessage(int(msg.Chat.ID), text)
	forwardMess := tgbotapi.NewForward(-278463800, msg.Chat.ID, msg.MessageID)
	cb.SendMessage(forwardMess)
	return
}

func (cb *Cinnabot) Cancel(msg *message) {
	cb.cache.Set(strconv.Itoa(msg.From.ID), "", cache.DefaultExpiration)

	text := "🤖: Command cancelled!\n"
	cb.SendTextMessage(int(msg.Chat.ID), text)
	return
}

// function to send message when someone enters dhsurvey tag
func (cb *Cinnabot) DHSurvey(msg *message) {

	replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), `
	🤖: Welcome to the Dining Hall Survey function! Please enter the following:

	1. Breakfast or dinner?
	2. Which stall did you have it from?
	3. Rate food from 1-5 (1: couldn't eat it, 5: would take another serving)
	4. Any feedback or complaints?
	
	Here's a sample response:
	
	1. Breakfast
	2. Asian
	3. 4
	4. Good food`)
	cb.SendMessage(replyMsg)

	// redirect to new function which takes the survey
	cb.cache.Set(strconv.Itoa(msg.From.ID), "/dhsurveyfeedback", cache.DefaultExpiration)
	return
}

// function to add DH survey entry to database
func (cb *Cinnabot) DHSurveyFeedback(msg *message) {

	// cache must return to normal after this fuction
	cb.cache.Set(strconv.Itoa(msg.From.ID), "", cache.DefaultExpiration)

	// add entry to database
	db := model.InitializeDB()
	modelFeedback, err := model.CreateFeedbackEntry(*msg.Message)
	if err != nil {
		cb.SendTextMessage(int(msg.From.ID), "🤖: Please enter correct format for feedback. :(")
	} else {
		db.Add(&modelFeedback)
		cb.SendTextMessage(int(msg.From.ID), "🤖: Thank you! The feedback will be sent to the dining hall committee. :)")
	}

	return
}
