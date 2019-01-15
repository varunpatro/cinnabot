package model

import (
	"errors"
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

func CreateFeedbackEntry(tgbotMsg tgbotapi.Message) (Feedback, error) {

	// split text
	splitRule := regexp.MustCompile("\n")
	text := splitRule.Split(tgbotMsg.Text, -1)

	// return error if all things not entered
	if len(text) < 3 {
		return Feedback{}, errors.New("incorrect format entered")
	}

	modelFeedback := Feedback{
		UserID:   tgbotMsg.From.ID,
		MealType: (text[0])[2:],
		Stall:    (text[1])[2:],
		Rating:   (text[2])[2:],
		Date:     tgbotMsg.Date,
	}

	if len(text) > 3 {
		modelFeedback.Additional = (text[3])[2:]
	} else {
		modelFeedback.Additional = ""
	}

	return modelFeedback, nil
}
