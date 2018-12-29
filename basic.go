package cinnabot

import (
	"net/http"
	"strconv"
	"strings"

	"encoding/json"
	"io/ioutil"
	"log"
	"math"
	"regexp"

	_ "github.com/jinzhu/gorm/dialects/sqlite"
	"github.com/pengnam/cinnabot/model"
	"gopkg.in/telegram-bot-api.v4"
)

//Test functions [Not meant to be used in bot]
// SayHello says hi.
func (cb *Cinnabot) SayHello(msg *message) {
	cb.SendTextMessage(int(msg.Chat.ID), "Hello there, "+msg.From.FirstName+"!")
}

// Echo parrots back the argument given by the user.
func (cb *Cinnabot) Echo(msg *message) {
	if len(msg.Args) == 0 {
		replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "/echo Cinnabot Parrot Mode 🤖\nWhat do you want me to parrot?\n\n")
		replyMsg.BaseChat.ReplyToMessageID = msg.MessageID
		replyMsg.ReplyMarkup = tgbotapi.ForceReply{ForceReply: true, Selective: true}
		cb.SendMessage(replyMsg)
		return
	}
	response := "🤖: " + strings.Join(msg.Args, " ")
	cb.SendTextMessage(int(msg.Chat.ID), response)
}

// Capitalize returns a capitalized form of the input string.
func (cb *Cinnabot) Capitalize(msg *message) {
	cb.SendTextMessage(int(msg.Chat.ID), strings.ToUpper(strings.Join(msg.Args, " ")))
}

//Start initializes the bot
func (cb *Cinnabot) Start(msg *message) {
	text := "Hello there " + msg.From.FirstName + "!\n\n" +
		"Im Cinnabot🤖. I am made by my owners to serve the residents of Cinnamon college!\n" +
		"Im always here to /help if you need it!"

	cb.SendTextMessage(int(msg.Chat.ID), text)
}

// Help gives a list of handles that the user may call along with a description of them
func (cb *Cinnabot) Help(msg *message) {
	if len(msg.Args) > 0 {

		if msg.Args[0] == "spaces" {
			text :=
				"To use the '/spaces' command, type one of the following:\n" +
					"'/spaces' : to view all bookings for today\n'/spaces now' : to view bookings active at this very moment\n" +
					"'/spaces week' : to view all bookings for this week\n'/spaces dd/mm(/yy)' : to view all bookings on a specific day\n" +
					"'/spaces dd/mm(/yy) dd/mm(/yy)' : to view all bookings in a specific range of dates"
			cb.SendTextMessage(int(msg.Chat.ID), text)
			return

		} else if msg.Args[0] == "cbs" {
			text :=
				"/subscribe <tag>: subscribe to a tag\n" +
					"/unsubscribe <tag>: unsubscribe from a tag\n" +
					"/broadcast <tag>: broadcast to a tag [admin]\n" +
					"Alternatively you can just type:\n" +
					"/subscribe for a button list\n" +
					"/unsubscribe for a button list\n"
			cb.SendTextMessage(int(msg.Chat.ID), text)
			return
		} else if msg.Args[0] == "resources" {
			text :=
				"/resources <tag>: searches resources for a specific tag\n" +
					"/resources: returns all tags"
			cb.SendTextMessage(int(msg.Chat.ID), text)
			return
		} else if msg.Args[0] == "publicbus" {
			text :=
				"/publicbus : publicbus\n" +
					"Sending your location (ignore the buttons) after running the above command will allow to get bus timings for bus stops around any location."
			cb.SendTextMessage(int(msg.Chat.ID), text)
			return
		}
	}
	text :=
		"Here are a list of functions to get you started 🤸 \n" +
			"/about: to find out more about me\n" +
			"/cbs: cinnamon broadcast system\n" +
			"/publicbus: public bus timings for bus stops around your location\n" +
			"/nusbus: nus bus timings for bus stops around your location\n" +
			"/weather: 2h weather forecast\n" +
			"/resources: list of important resources!\n" +
			"/spaces: list of space bookings\n" +
			"/feedback: to give feedback\n\n" +
			"_*My creator actually snuck in a few more functions🕺 *_\n" +
			"Try using /help <func name> to see what I can _really_ do"
	cb.SendTextMessage(int(msg.Chat.ID), text)
}

// About returns a link to Cinnabot's source code.
func (cb *Cinnabot) About(msg *message) {
	cb.SendTextMessage(int(msg.Chat.ID), "Touch me: https://github.com/varunpatro/Cinnabot")
}

//Link returns useful resources
func (cb *Cinnabot) Resources(msg *message) {
	resources := make(map[string]string)
	resources["usplife"] = "[fb page](https://www.facebook.com/groups/usplife/)"
	resources["food"] = "@rcmealbot"
	resources["spaces"] = "[spaces web](http://www.nususc.com/Spaces.aspx)"
	resources["usc"] = "[usc web](http://www.nususc.com/MainPage.aspx)"
	resources["study groups"] = "@USPhonebook\\_bot"

	var key string = strings.ToLower(strings.Join(msg.Args, " "))
	log.Print(key)
	_, ok := resources[key]
	if ok {
		cb.SendTextMessage(int(msg.Chat.ID), resources[key])
	} else {
		var values string = ""
		for key, _ := range resources {
			values += key + " : " + resources[key] + "\n"
		}
		msg := tgbotapi.NewMessage(msg.Chat.ID, values)
		msg.DisableWebPagePreview = true
		msg.ParseMode = "markdown"
		cb.SendMessage(msg)
	}
}

//Structs for weather forecast function
type WeatherForecast struct {
	AM []AreaMetadata `json:"area_metadata"`
	FD []ForecastData `json:"items"`
}

type AreaMetadata struct {
	Name string            `json:"name"`
	Loc  tgbotapi.Location `json:"label_location"`
}

type ForecastData struct {
	FMD []ForecastMetadata `json:"forecasts"`
}

type ForecastMetadata struct {
	Name     string `json:"area"`
	Forecast string `json:"forecast"`
}

//Weather checks the weather based on given location
func (cb *Cinnabot) Weather(msg *message) {
	//Check if weather was sent with location, if not reply with markup
	if len(msg.Args) == 0 || !cb.CheckArgCmdPair("/weather", msg.Args) {
		opt1 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Cinnamon"))
		opt2B := tgbotapi.NewKeyboardButton("Here")
		opt2B.RequestLocation = true
		opt2 := tgbotapi.NewKeyboardButtonRow(opt2B)

		options := tgbotapi.NewReplyKeyboard(opt1, opt2)

		replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID), "🤖: Where are you?\n\n")
		replyMsg.ReplyMarkup = options
		cb.SendMessage(replyMsg)
		return
	}

	//Default loc: Cinnamon
	loc := &tgbotapi.Location{Latitude: 1.306671, Longitude: 103.773556}

	if msg.Location != nil {
		loc = msg.Location
	}

	//Send request to api.data.gov.sg for weather data
	client := &http.Client{}

	req, _ := http.NewRequest("GET", "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast", nil)
	req.Header.Set("api-key", "d1Y8YtThOpkE5QUfQZmvuA3ktrHa1uWP")

	resp, _ := client.Do(req)
	responseData, _ := ioutil.ReadAll(resp.Body)

	wf := WeatherForecast{}
	if err := json.Unmarshal(responseData, &wf); err != nil {
		log.Fatal(err)
		return
	}

	lowestDistance := distanceBetween(wf.AM[0].Loc, *loc)
	nameMinLoc := wf.AM[0].Name
	for i := 1; i < len(wf.AM); i++ {
		currDistance := distanceBetween(wf.AM[i].Loc, *loc)
		if currDistance < lowestDistance {
			lowestDistance = currDistance
			nameMinLoc = wf.AM[i].Name
		}
	}
	log.Print("The closest location is " + nameMinLoc)

	var forecast string
	for i, _ := range wf.FD[0].FMD {
		if wf.FD[0].FMD[i].Name == nameMinLoc {
			forecast = wf.FD[0].FMD[i].Forecast
			break
		}
	}

	//Parsing forecast
	words := strings.Fields(forecast)
	forecast = strings.ToLower(strings.Join(words[:len(words)-1], " "))

	responseString := "🤖: The 2h forecast is " + forecast + " for " + nameMinLoc
	returnMsg := tgbotapi.NewMessage(msg.Chat.ID, responseString)
	returnMsg.ParseMode = "Markdown"
	returnMsg.ReplyMarkup = tgbotapi.NewRemoveKeyboard(true)
	cb.SendMessage(returnMsg)

}

//Helper funcs for weather
func distanceBetween(Loc1 tgbotapi.Location, Loc2 tgbotapi.Location) float64 {
	x := math.Pow((float64(Loc1.Latitude - Loc2.Latitude)), 2)
	y := math.Pow((float64(Loc1.Longitude - Loc2.Longitude)), 2)
	return x + y
}

//Broadcast broadcasts a message after checking for admin status [trial]
//Admins are to first send a message with tags before sending actual message
func (cb *Cinnabot) Broadcast(msg *message) {
	val := checkAdmin(cb, msg)
	if !val {
		cb.SendTextMessage(int(msg.Chat.ID), "🤖: Im sorry! You do not seem to be one of my overlords")
		return
	}

	if len(msg.Args) == 0 {
		text := "🤖: Please do /broadcast <tag>\n*Tags:*\n"
		for i := 0; i < len(cb.allTags); i += 2 {
			text += cb.allTags[i] + "\n"
		}
		cb.SendTextMessage(int(msg.Chat.ID), text)
		return
	}
	//Used to initialize tags in a mark-up. Ensure that people check their tags
	if msg.ReplyToMessage == nil {
		//Scan for tags
		r := regexp.MustCompile(`\/\w*`)
		locReply := r.FindStringIndex(msg.Text)
		tags := strings.Fields(strings.ToLower(msg.Text[locReply[1]:]))

		//Filter for valid tags
		var checkedTags []string
		for i := 0; i < len(tags); i++ {
			if cb.db.CheckTagExists(int(msg.Chat.ID), tags[i]) {
				checkedTags = append(checkedTags, tags[i])
			}
		}
		if tags[0] == "all" {
			checkedTags = append(checkedTags, "all")
		}

		if len(checkedTags) == 0 {
			cb.SendTextMessage(int(msg.Chat.ID), "🤖: No valid tags found")
			return
		}

		reminderMsg := tgbotapi.NewMessage(msg.Chat.ID, "REMINDER: Please include tag at start of message. \n Format: #<tagname1> #<tagname2> <msg>")
		cb.SendMessage(reminderMsg)

		//Send in mark-up
		replyMsg := tgbotapi.NewMessage(msg.Chat.ID, "/broadcast "+strings.Join(checkedTags, " "))
		replyMsg.BaseChat.ReplyToMessageID = msg.MessageID
		replyMsg.ReplyMarkup = tgbotapi.ForceReply{ForceReply: true, Selective: true}
		cb.SendMessage(replyMsg)
		return

	}

	//Tags to send to
	r := regexp.MustCompile(`\/\w*`)
	locReply := r.FindStringIndex(msg.ReplyToMessage.Text)
	tags := strings.Fields(msg.ReplyToMessage.Text[locReply[1]:])

	userGroup := cb.db.UserGroup(tags)

	//Forwards message to everyone in the group
	for j := 0; j < len(userGroup); j++ {
		forwardMess := tgbotapi.NewForward(int64(userGroup[j].UserID), msg.Chat.ID, msg.MessageID)
		cb.SendMessage(forwardMess)
	}

	return
}

func checkAdmin(cb *Cinnabot, msg *message) bool {
	for _, admin := range cb.keys.Admins {
		if admin == msg.From.ID {
			return true
		} else if admin == int(msg.Chat.ID) {
			return true
		}
	}
	return false
}

// function to count number of users and messages
func (cb *Cinnabot) GetStats(msg *message) {

	db := model.InitializeDB()

	if cb.CheckArgCmdPair("/stats", msg.Args) {
		key := msg.Args[0]
		countUsers, countMessages := db.CountUsersAndMessages(key)
		mostUsedCommand := db.GetMostUsedCommand(key)

		extraString := ""
		if key != "forever" {
			extraString = " for the " + key
		}

		cb.SendTextMessage(int(msg.From.ID), "🤖: Here are some stats"+
			extraString+"!\n\n"+
			"Number of users registered on bot: "+strconv.Itoa(countUsers)+"\n"+
			"Numbery of messages typed: "+strconv.Itoa(countMessages)+"\n"+
			"Most used command: "+mostUsedCommand)
		return
	}

	opt1 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Week"))
	opt2 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Month"))
	opt3 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Year"))
	opt4 := tgbotapi.NewKeyboardButtonRow(tgbotapi.NewKeyboardButton("Forever"))

	options := tgbotapi.NewReplyKeyboard(opt1, opt2, opt3, opt4)

	replyMsg := tgbotapi.NewMessage(int64(msg.Message.From.ID),
		"🤖: Please select the time period.")
	replyMsg.ReplyMarkup = options
	cb.SendMessage(replyMsg)

	return
}
