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

	"github.com/tucnak/telebot"
)

// CinnaBot is the main struct. All response funcs bind to this.
type CinnaBot struct {
	Name string // The name of the bot registered with Botfather
	bot  *telebot.Bot
	log  *log.Logger
	fmap FuncMap
	keys config
}

// Configuration struct for setting up CinnaBot
type config struct {
	Name           string `json:"name"`
	TelegramAPIKey string `json:"telegram_api_key"`
	Admins         []int  `json:"admins"`
}

// Wrapper struct for a message
type message struct {
	Cmd  string
	Args []string
	*telebot.Message
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
// It is use for routing comamnds to responses.
type FuncMap map[string]ResponseFunc

// ResponseFunc is a handler for a bot command.
type ResponseFunc func(m *message)

// Initialise a CinnaBot.
// lg is optional.
func InitCinnaBot(configJSON []byte, lg *log.Logger) *CinnaBot {
	// We'll use random numbers throughout CinnaBot
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

	bot, err := telebot.NewBot(cfg.TelegramAPIKey)
	if err != nil {
		log.Fatalf("error creating new bot, dude %s", err)
	}

	j := &CinnaBot{Name: cfg.Name, bot: bot, log: lg, keys: cfg}
	j.fmap = j.getDefaultFuncMap()

	return j
}

// Listen exposes the telebot Listen API.
func (j *CinnaBot) Listen(subscription chan telebot.Message, timeout time.Duration) {
	j.bot.Listen(subscription, timeout)
}

// Get the built-in, default FuncMap.
func (j *CinnaBot) getDefaultFuncMap() FuncMap {
	return FuncMap { }
}

// Add a response function to the FuncMap
func (j *CinnaBot) AddFunction(command string, resp ResponseFunc) error {
	if !strings.HasPrefix(command, "/") {
		return fmt.Errorf("not a valid command string - it should be of the format /something")
	}
	j.fmap[command] = resp
	return nil
}

// Route received Telegram messages to the appropriate response functions.
func (j *CinnaBot) Router(msg telebot.Message) {
	// Don't respond to forwarded commands
	if msg.IsForwarded() {
		return
	}
	jmsg := j.parseMessage(&msg)
	if jmsg.Cmd != "" {
		j.log.Printf("[%s][id: %d] command: %s, args: %s", time.Now().Format(time.RFC3339), jmsg.ID, jmsg.Cmd, jmsg.GetArgString())
	}
	execFn := j.fmap[jmsg.Cmd]

	if execFn != nil {
		j.GoSafely(func() { execFn(jmsg) })
	} else {
		j.SendMessage(msg.Chat, "No such command!", &telebot.SendOptions{ReplyTo: msg})
	}
}

// GoSafely is a utility wrapper to recover and log panics in goroutines.
// If we use naked goroutines, a panic in any one of them crashes
// the whole program. Using GoSafely prevents this.
func (j *CinnaBot) GoSafely(fn func()) {
	go func() {
		defer func() {
			if err := recover(); err != nil {
				stack := make([]byte, 1024*8)
				stack = stack[:runtime.Stack(stack, false)]

				j.log.Printf("PANIC: %s\n%s", err, stack)
			}
		}()

		fn()
	}()
}

// Helper to parse incoming messages and return CinnaBot messages
func (j *CinnaBot) parseMessage(msg *telebot.Message) *message {
	cmd := ""
	args := []string{}

	if msg.IsReply() {
		// We use a hack. All reply-to messages have the command it's replying to as the
		// part of the message.
		r := regexp.MustCompile(`\/\w*`)
		res := r.FindString(msg.ReplyTo.Text)
		for k, _ := range j.fmap {
			if res == k {
				cmd = k
				args = strings.Split(msg.Text, " ")
				break
			}
		}
	} else if msg.Text != "" {
		msgTokens := strings.Fields(msg.Text)
		cmd, args = strings.ToLower(msgTokens[0]), msgTokens[1:]
		// Deal with commands of the form command@CinnaBot, which appear in
		// group chats.
		if strings.Contains(cmd, "@") {
			c := strings.Split(cmd, "@")
			cmd = c[0]
		}
	}

	return &message{Cmd: cmd, Args: args, Message: msg}
}

func (j *CinnaBot) SendMessage(recipient telebot.Recipient, msg string, options *telebot.SendOptions) {
	j.bot.SendMessage(recipient, msg, options)
}
