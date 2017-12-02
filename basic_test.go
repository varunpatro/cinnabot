package cinnabot

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/mock"
	"gopkg.in/telegram-bot-api.v4"
)

var (
	mockMsg message
)

type mockBot struct {
	mock.Mock
}

func (mb *mockBot) GetUpdatesChan(config tgbotapi.UpdateConfig) (tgbotapi.UpdatesChannel, error) {
	return nil, nil
}

func (mb *mockBot) Send(c tgbotapi.Chattable) (tgbotapi.Message, error) {
	args := mb.Called(c)
	return tgbotapi.Message{}, args.Error(0)
}

func setup() {

	mockMsg = message{
		Args: []string{"test_args1", "test_args2"},
		Message: &tgbotapi.Message{
			MessageID: 1,
			From: &tgbotapi.User{
				ID:        999,
				FirstName: "test_first_name_user",
			},
		},
	}
}

func TestMain(m *testing.M) {
	setup()
	os.Exit(m.Run())
}

func TestSayHello(t *testing.T) {
	mb := mockBot{}
	cb := Cinnabot{
		bot: &mb,
	}
	expectedMsgStr := "Hello there, " + mockMsg.From.FirstName + "!"
	expectedMsg := tgbotapi.NewMessage(999, expectedMsgStr)
	mb.On("Send", expectedMsg).Return(nil)
	cb.SayHello(&mockMsg)
}

func TestEcho(t *testing.T) {
	mb := mockBot{}
	cb := Cinnabot{
		bot: &mb,
	}

	expectedMsgStr := "🤖: " + strings.Join(mockMsg.Args, " ")
	expectedMsg := tgbotapi.NewMessage(999, expectedMsgStr)
	mb.On("Send", expectedMsg).Return(nil)
	cb.Echo(&mockMsg)
}

func TestCapitalize(t *testing.T) {
	mb := mockBot{}
	cb := Cinnabot{
		bot: &mb,
	}
	expectedMsgStr := "TEST_ARGS1 TEST_ARGS2"
	expectedMsg := tgbotapi.NewMessage(999, expectedMsgStr)
	mb.On("Send", expectedMsg).Return(nil)
	cb.Capitalize(&mockMsg)
}

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
