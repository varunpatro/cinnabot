package cinnabot

import (
	"testing"

	"gopkg.in/telegram-bot-api.v4"
)

func TestSpaces(t *testing.T) {
	mb := mockBot{}
	cb := Cinnabot{
		bot: &mb,
	}

	mockMsg2 := message{
		Args: []string{"29/05/16"},
		Message: &tgbotapi.Message{
			MessageID: 1,
			From: &tgbotapi.User{
				ID:        999,
				FirstName: "test_first_name_user",
			},
		},
	}

	expectedMsgStr := "Displaying bookings on Sun, 29 May 2016:\n\n=======================\nTHEME ROOM 1\n=======================\nAbhi Sujit Parikh (Theme Room closed for SEAM/AUS/FOP Activities)\n12:01AM to 11:59PM, Sun, 29 May 2016\n\n\n=======================\nTHEME ROOM 2\n=======================\n[No bookings recorded]\n\n\n=======================\nCHUA THIAN POH HALL\n=======================\n[No bookings recorded]\n\n\n=======================\nAMPHITHEATRE\n=======================\n[No bookings recorded]\n\n\n=======================\nCHATTERBOX\n=======================\n[No bookings recorded]"
	expectedMsg := tgbotapi.NewMessage(999, expectedMsgStr)
	mb.On("Send", expectedMsg).Return(nil)
	cb.Spaces(&mockMsg2)
}
