package cinnabot

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/patrickmn/go-cache"
	"github.com/varunpatro/cinnabot/model"
	"gopkg.in/telegram-bot-api.v4"
)

type bot interface {
	Send(c tgbotapi.Chattable) (tgbotapi.Message, error)
	GetUpdatesChan(config tgbotapi.UpdateConfig) (tgbotapi.UpdatesChannel, error)
}

// Cinnabot is main struct that processes user requests.
type Cinnabot struct {
	Name    string // The name of the bot registered with Botfather
	bot     bot
	log     *log.Logger
	fmap    FuncMap
	keys    config
	db      model.DataGroup
	cache   *cache.Cache
	allTags map[string]string
}

// Configuration struct for setting up Cinnabot
type config struct {
	Name           string `json:"name"`
	TelegramAPIKey string `json:"telegram_api_key"`
	WeatherAPIKey  string `json:weather_api_key`
	Admins         []int  `json:"admins"`
}

// Wrapper struct for a message
type message struct {
	Cmd  string
	Args []string
	*tgbotapi.Message
}

// GetArgStrings prints out the arguments for the message in one string.
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

// InitCinnabot initializes an instance of Cinnabot.
func InitCinnabot(configJSON []byte, lg *log.Logger) *Cinnabot {
	// We'll use random numbers throughout Cinnabot
	rand.Seed(time.Now().UTC().UnixNano())

	if lg == nil {
		lg = log.New(os.Stdout, "[Cinnabot] ", 0)
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

	cb := &Cinnabot{Name: cfg.Name, bot: bot, log: lg, keys: cfg}
	cb.fmap = cb.getDefaultFuncMap()
	cb.db = model.InitializeDB()
	cb.cache = cache.New(1*time.Minute, 2*time.Minute)
	//tag alternates with tag description
	cb.allTags = map[string]string{"events": "EVENTS of cinnamon college", "food": "Free/not free FOOD updates of all kind for the hungry", "weather": "Weather updates. Im not sure why you would want it actually.", "warm": "If you want some nice warm things occasionally"}

	return cb
}

// Listen exposes the telebot Listen API.
func (cb *Cinnabot) Listen(timeout int) tgbotapi.UpdatesChannel {
	u := tgbotapi.NewUpdate(0)
	u.Timeout = timeout
	updates, err := cb.bot.GetUpdatesChan(u)
	if err != nil {
		log.Fatalf("error creating updates channel: %s", err)
	}
	return updates
}

// Get the built-in, default FuncMap.
func (cb *Cinnabot) getDefaultFuncMap() FuncMap {
	return FuncMap{}
}

// AddFunction binds a response function to a command string in Cinnabot's FuncMap
func (cb *Cinnabot) AddFunction(command string, resp ResponseFunc) error {
	if !strings.HasPrefix(command, "/") {
		return fmt.Errorf("not a valid command string - it should be of the format /something")
	}
	cb.fmap[command] = resp
	return nil
}

// Router routes Telegram messages to the appropriate response functions.
//HACK: Cache to store previous function information
func (cb *Cinnabot) Router(msg tgbotapi.Message) {
	// Don't respond to forwarded commands
	if msg.ForwardFrom != nil {
		return
	}
	cmsg := cb.parseMessage(&msg)
	if cmsg.Cmd != "" {
		cb.log.Printf("[%s][id: %d] command: %s, args: %s", time.Now().Format(time.RFC3339), cmsg.MessageID, cmsg.Cmd, cmsg.GetArgString())
	}
	execFn := cb.fmap[cmsg.Cmd]
	log.Print(msg.Chat.ID)
	if execFn != nil {
		cb.GoSafely(func() { execFn(cmsg) })

		cb.cache.Set(strconv.Itoa(msg.From.ID), cmsg.Cmd, cache.DefaultExpiration)

	} else if cmdRaw, check := cb.cache.Get(strconv.Itoa(msg.From.ID)); check {
		//Have to typecast
		cmd := cmdRaw.(string)
		//If cmd in cache and arg matches command

		cmsg.Args = append([]string{cmsg.Cmd}, cmsg.Args...)

		if cb.CheckArgCmdPair(cmd, cmsg.Args) {
			//Get function from previous command
			execFn = cb.fmap[cmd]
			//Ensure tokens is in order [unecessary]
			cmsg.Cmd = cmd

			cb.GoSafely(func() { execFn(cmsg) })
			return
		}
		replyMessage := tgbotapi.NewMessage(int64(msg.From.ID), "No such command!")
		replyMessage.ReplyMarkup = tgbotapi.NewRemoveKeyboard(true)
		cb.SendMessage(replyMessage)

	}
}

//Checks if arg can be used with command
//Used to supplement cache as cache only records functions as states
func (cb *Cinnabot) CheckArgCmdPair(cmd string, args []string) bool {
	key := "" //Messages with no text in message
	if len(args) > 0 {
		key = args[0]
		log.Print(key)
	}
	checkMap := make(map[string][]string)
	//Args must always be lower cased
	checkMap["/feedback"] = []string{"cinnabot", "dining", "residential", "usc", "general(usc)"}
	checkMap["/cinnabotfeedback"] = []string{"anything"}
	checkMap["/uscfeedback"] = []string{"anything"}
	checkMap["/diningfeedback"] = []string{"anything"}
	checkMap["/residentialfeedback"] = []string{"anything"}
	checkMap["/cbs"] = []string{"subscribe", "unsubscribe"}

	checkMap["/publicbus"] = []string{"cinnamon", ""}
	checkMap["/nusbus"] = []string{"utown", "science", "arts", "law", "yih/engin", "cenlib", "biz", "yih", "kr-mrt", "mpsh", "comp", ""}
	checkMap["/weather"] = []string{"cinnamon", ""}
	tags := make([]string, len(cb.allTags))

	i := 0
	for k := range cb.allTags {
		tags[i] = k
		i++
	}
	checkMap["/subscribe"] = append(tags, "everything")
	checkMap["/unsubscribe"] = append(tags, "everything")

	arr := checkMap[cmd]
	for i := 0; i < len(arr); i++ {
		//If tag is anything, accept it
		if arr[i] == "anything" {
			return true
		}
		//Check tags
		if arr[i] == key {
			return true
		}
	}
	return false
}

// GoSafely is a utility wrapper to recover and log panics in goroutines.
// If we use naked goroutines, a panic in any one of them crashes
// the whole program. Using GoSafely prevents this.
func (cb *Cinnabot) GoSafely(fn func()) {
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

// Helper to parse incoming messages and return Cinnabot messages
func (cb *Cinnabot) parseMessage(msg *tgbotapi.Message) *message {
	cmd := ""
	args := []string{}

	if msg.ReplyToMessage != nil {
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
		// Deal with commands of the form command@Cinnabot, which appear in
		// group chats.
		if strings.Contains(cmd, "@") {
			c := strings.Split(cmd, "@")
			cmd = c[0]
		}
	}

	return &message{Cmd: cmd, Args: args, Message: msg}
}

// SendTextMessage sends a basic text message back to the specified user.
func (cb *Cinnabot) SendTextMessage(recipient int, text string) error {
	msg := tgbotapi.NewMessage(int64(recipient), text)
	msg.ReplyMarkup = tgbotapi.NewRemoveKeyboard(true)
	msg.ParseMode = "Markdown"
	_, err := cb.bot.Send(msg)
	return err
}

// SendMessage sends messages which require non-default options such as reply markups.
func (cb *Cinnabot) SendMessage(chattable tgbotapi.Chattable) {
	cb.bot.Send(chattable)
}
