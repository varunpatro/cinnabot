package model

import (
	"regexp"

	"github.com/jinzhu/gorm"
	"gopkg.in/telegram-bot-api.v4"
)

// structure to store feedback
type Feedback struct {
	gorm.Model
	UserID     int
	MealType   string
	Stall      string
	Rating     string
	Additional string
	Date       int
}

func CreateFeedbackEntry(tgbotMsg tgbotapi.Message) Feedback {
	// split text
	splitRule := regexp.MustCompile(`([1-4]\.)`)
	text := splitRule.Split(tgbotMsg.Text, -1)
	modelFeedback := Feedback{
		UserID:     tgbotMsg.From.ID,
		MealType:   text[1],
		Stall:      text[2],
		Rating:     text[3],
		Additional: text[4],
		Date:       tgbotMsg.Date,
	}

	return modelFeedback
}
