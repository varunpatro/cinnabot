package cinnabot

import (
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/mock"
	"github.com/tucnak/telebot"
)

var (
	mockChat telebot.Chat
	mockMsg  message
)

type mockBot struct {
	mock.Mock
}

func (mb *mockBot) Listen(subscription chan telebot.Message, timeout time.Duration) {
	mb.Called(subscription, timeout)
}

func (mb *mockBot) SendMessage(recipient telebot.Recipient, msg string, options *telebot.SendOptions) error {
	args := mb.Called(recipient, msg, options)
	return args.Error(0)
}

func setup() {
	mockChat = telebot.Chat{
		ID: 9999,
	}

	mockMsg = message{
		Args: []string{"test_args1", "test_args2"},
		Message: &telebot.Message{
			Chat: mockChat,
			Sender: telebot.User{
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
	cb := cinnabot{
		bot: &mb,
	}
	var expectedOptions *telebot.SendOptions = nil
	expectedMsgStr := "Hello there, " + mockMsg.Sender.FirstName + "!"
	mb.On("SendMessage", mockChat, expectedMsgStr, expectedOptions).Return(nil)
	cb.SayHello(&mockMsg)
}

func TestEcho(t *testing.T) {
	mb := mockBot{}
	cb := cinnabot{
		bot: &mb,
	}
	var expectedOptions *telebot.SendOptions = nil
	expectedMsgStr := "🤖: " + strings.Join(mockMsg.Args, " ")
	mb.On("SendMessage", mockChat, expectedMsgStr, expectedOptions).Return(nil)
	cb.Echo(&mockMsg)
}
