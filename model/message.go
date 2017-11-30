package model

import (
	"github.com/jinzhu/gorm"
	"gopkg.in/telegram-bot-api.v4"
)

type Message struct {
	gorm.Model
	MessageID int
	UserID    int
	User      User `gorm:"ForeignKey:UserID;AssociationForeignKey:UserID"`
	Text      string
	Date      int
}

func FromTelegramMessage(tgbotMsg tgbotapi.Message) Message {
	modelMsg := Message{
		MessageID: tgbotMsg.MessageID,
		Text:      tgbotMsg.Text,
		Date:      tgbotMsg.Date,
		UserID:    tgbotMsg.From.ID,
		User: User{
			FirstName: tgbotMsg.From.FirstName,
			LastName:  tgbotMsg.From.LastName,
			UserName:  tgbotMsg.From.UserName,
		},
	}
	return modelMsg
}
