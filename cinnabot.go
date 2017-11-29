package cinnabot

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"regexp"
	"runtime"
	"strings"
	"time"

	"gopkg.in/telegram-bot-api.v4"
)

type bot interface {
	Send(c tgbotapi.Chattable) (tgbotapi.Message, error)
	GetUpdatesChan(config tgbotapi.UpdateConfig) (tgbotapi.UpdatesChannel, error)
}

type cinnabot struct {
	Name string // The name of the bot registered with Botfather
	bot  bot
	log  *log.Logger
	fmap FuncMap
	keys config
}

// Configuration struct for setting up cinnabot
type config struct {
	Name           string `json:"name"`
	TelegramAPIKey string `json:"telegram_api_key"`
	Admins         []int  `json:"admins"`
}

// Wrapper struct for a message
type message struct {
	Cmd  string
	Args []string
	*tgbotapi.Message
}

// GetArgs prints out the arguments for the message in one string.
func (m message) GetArgString() string {
	argString := ""
	for _, s := range m.Args {
		argString = argString + s + " "
	}
	return strings.TrimSpace(argString)
}

// A FuncMap is a map of command strings to response functions.
// It is used for routing commands to responses.
type FuncMap map[string]ResponseFunc

// ResponseFunc is a handler for a bot command.
type ResponseFunc func(m *message)

// Initialize cinnabot
func InitCinnabot(configJSON []byte, lg *log.Logger) *cinnabot {
	// We'll use random numbers throughout cinnabot
	rand.Seed(time.Now().UTC().UnixNano())

	if lg == nil {
		lg = log.New(os.Stdout, "[cinnabot] ", 0)
	}

	var cfg config
	err := json.Unmarshal(configJSON, &cfg)
	if err != nil {
		lg.Fatalf("cannot unmarshal config json: %s", err)
	}

	if cfg.TelegramAPIKey == "" {
		log.Fatalf("config.json exists but doesn't contain a Telegram API Key! Read https://core.telegram.org/bots#3-how-do-i-create-a-bot on how to get one!")
	}

	if cfg.Name == "" {
		log.Fatalf("config.json exists but doesn't contain a bot name. Set your botname when registering with The Botfather.")
	}

	if len(cfg.Admins) == 0 {
		log.Fatalf("config.json exists, but doesn't contain any admins.")
	}

	bot, err := tgbotapi.NewBotAPI(cfg.TelegramAPIKey)
	if err != nil {
		log.Fatalf("error creating new bot, dude %s", err)
	}

	cb := &cinnabot{Name: cfg.Name, bot: bot, log: lg, keys: cfg}
	cb.fmap = cb.getDefaultFuncMap()

	return cb
}

// Listen exposes the telebot Listen API.
func (cb *cinnabot) Listen(timeout int) tgbotapi.UpdatesChannel {
	u := tgbotapi.NewUpdate(0)
	u.Timeout = timeout
	updates, err := cb.bot.GetUpdatesChan(u)
	if err != nil {
		log.Fatalf("error creating updates channel: %s", err)
	}
	return updates
}

// Get the built-in, default FuncMap.
func (cb *cinnabot) getDefaultFuncMap() FuncMap {
	return FuncMap{}
}

// Add a response function to the FuncMap
func (cb *cinnabot) AddFunction(command string, resp ResponseFunc) error {
	if !strings.HasPrefix(command, "/") {
		return fmt.Errorf("not a valid command string - it should be of the format /something")
	}
	cb.fmap[command] = resp
	return nil
}

// Route received Telegram messages to the appropriate response functions.
func (cb *cinnabot) Router(msg tgbotapi.Message) {
	// Don't respond to forwarded commands
	if msg.ForwardFrom != nil {
		return
	}
	cmsg := cb.parseMessage(&msg)
	if cmsg.Cmd != "" {
		cb.log.Printf("[%s][id: %d] command: %s, args: %s", time.Now().Format(time.RFC3339), cmsg.MessageID, cmsg.Cmd, cmsg.GetArgString())
	}
	execFn := cb.fmap[cmsg.Cmd]

	if execFn != nil {
		cb.GoSafely(func() { execFn(cmsg) })
	} else {
		cb.SendTextMessage(msg.From.ID, "No such command!")
	}
}

// GoSafely is a utility wrapper to recover and log panics in goroutines.
// If we use naked goroutines, a panic in any one of them crashes
// the whole program. Using GoSafely prevents this.
func (cb *cinnabot) GoSafely(fn func()) {
	go func() {
		defer func() {
			if err := recover(); err != nil {
				stack := make([]byte, 1024*8)
				stack = stack[:runtime.Stack(stack, false)]

				cb.log.Printf("PANIC: %s\n%s", err, stack)
			}
		}()

		fn()
	}()
}

// Helper to parse incoming messages and return cinnabot messages
func (cb *cinnabot) parseMessage(msg *tgbotapi.Message) *message {
	cmd := ""
	args := []string{}

	if msg.ReplyToMessage != nil {
		// We use a hack. All reply-to messages have the command it's replying to as the
		// part of the message.
		r := regexp.MustCompile(`\/\w*`)
		res := r.FindString(msg.ReplyToMessage.Text)
		for k := range cb.fmap {
			if res == k {
				cmd = k
				args = strings.Split(msg.Text, " ")
				break
			}
		}
	} else if msg.Text != "" {
		msgTokens := strings.Fields(msg.Text)
		cmd, args = strings.ToLower(msgTokens[0]), msgTokens[1:]
		// Deal with commands of the form command@cinnabot, which appear in
		// group chats.
		if strings.Contains(cmd, "@") {
			c := strings.Split(cmd, "@")
			cmd = c[0]
		}
	}

	return &message{Cmd: cmd, Args: args, Message: msg}
}

func (cb *cinnabot) SendTextMessage(recipient int, text string) error {
	msg := tgbotapi.NewMessage(int64(recipient), text)
	_, err := cb.bot.Send(msg)
	return err
}
func (cb *cinnabot) SendMessage(chattable tgbotapi.Chattable) {
	cb.bot.Send(chattable)
}
