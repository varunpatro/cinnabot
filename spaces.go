package cinnabot

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"sort"
	"time"
)

// An Event is a single booking of a location.
type Event struct {
	Type   string  `json:"__type"`
	ID     float64 `json:"id"`
	Title  string  `json:"title"`
	Start  string  `json:"start"`
	End    string  `json:"end"`
	AllDay bool    `json:"allDay"`
	Color  string  `json:"colour"`
}

//String constants
const (
	TR1 = "THEME ROOM 1"
	TR2 = "THEME ROOM 2"
	CTPH = "CHUA THIAN POH HALL"
	AMPH = "AMPHITHEATRE"
	CHATTER = "CHATTERBOX"
)

// Used ONLY for Unmarshalling. Has an additional annoying layer "d" inside which can be abstracted away.
type rawSpace struct {
	D []Event `json:"d"`
}

// Space stores a set of Events, all belonging to the same location ("Space"), such as TR1 or CTPH.
type Space []Event

// Spaces contains all info about Spaces. Use spaces.Restrict(...) to select a subset to be displayed.
//type Spaces []Space

type Spaces []Space

// ByStartDate implements sort.Interface for Space based on the space[i].Start field
type ByStartDate Space

func (space ByStartDate) Len() int      { return len(space) }
func (space ByStartDate) Swap(i, j int) { space[i], space[j] = space[j], space[i] }
func (space ByStartDate) Less(i, j int) bool {
	return ParseJSONDate(space[i].Start).Before(ParseJSONDate(space[j].Start))
}

// SortByStartDate returns a new Space whose Events are sorted in chronological order.
func (space Space) sortByStartDate() Space {
	sort.Sort(ByStartDate(space))
	return space
}

// ScanRawSpace requests data for a single Space from nususc.com
func scanRawSpace(rawSpacePointer *rawSpace, facilityID int) {

	spacesURL := "http://www.nususc.com/USCWebsiteInformationAPI.asmx/GetSpacesBookingRecord"
	//data to send in body
	requestBody := []byte(fmt.Sprintf("{ \"facilityID\": \"%d\" }", facilityID))

	//Send http request and receive response
	client := http.Client{}
	request, requestErr := http.NewRequest("POST",
		spacesURL,
		bytes.NewBuffer(requestBody))
	if requestErr != nil {
		panic("Error in spaces.go while creating HTTP request")
	}
	request.Header.Set("Content-Type", "application/json")

	response, responseError := client.Do(request)
	if responseError != nil {
		panic("Error in spaces.go while receiving HTTP response")
	}

	defer response.Body.Close() //Close buffer

	//Get raw json data
	rawData, rawDataError := ioutil.ReadAll(response.Body)
	if rawDataError != nil {
		panic("Error in spaces.go while reading HTTP response body")
	}

	//Unmarshal json data
	json.Unmarshal(rawData, rawSpacePointer)
}

// GetSpace obtains Space information for a given space, as identified by its facilityID. (cf. SpaceName(facilityID))
func getSpace(facilityID int) Space {
	rawSpace := rawSpace{}
	scanRawSpace(&rawSpace, facilityID)
	var space Space = rawSpace.D
	return space
}

// GetSpaces obtains all spaces booking info from nususc.com/Spaces.aspx
func getSpaces() Spaces {
	spaces := Spaces{}
	for i := 0; i < 6; i++ {
		spaces = append(spaces, (getSpace(i + 1)).sortByStartDate())
	}
	return spaces
}

// ParseJSONDate parses date from format used in nususc.com's API into a time.Time object
func ParseJSONDate(date string) time.Time {
	format := "2006-01-02T15:04:05"
	t, err := time.Parse(format, date)
	if err != nil {
		panic(fmt.Sprintf("Error in spaces.go while parsing %s as a JSON date", date))
	}
	return t
}

// ParseDDMMYYDate parses user-inputted dd/mm/yy date into time.Time
func ParseDDMMYYDate(date string) (time.Time, error) {
	//Attempt to parse as dd/mm/yy
	format := "02/01/06"
	t, err := time.Parse(format, date)
	if err != nil {
		// Attempt to parse as dd/m/yy
		format = "02/1/06"
		t, err = time.Parse(format, date)
	}
	if err != nil {
		// Attempt to parse as d/mm/yy
		format = "2/01/06"
		t, err = time.Parse(format, date)
	}
	if err != nil {
		// Attempt to parse as d/m/yy
		format = "2/1/06"
		t, err = time.Parse(format, date)
	}
	if err != nil {
		// Attempt to parse as some form of dd/mm
		// Attempt to parse as dd/mm
		format = "02/01"
		t, err = time.Parse(format, date)
		if err != nil {
			// Attempt to parse as dd/m
			format = "02/1"
			t, err = time.Parse(format, date)
		}
		if err != nil {
			// Attempt to parse as d/mm
			format = "2/01"
			t, err = time.Parse(format, date)
		}
		if err != nil {
			// Attempt to parse as d/m
			format = "2/1"
			t, err = time.Parse(format, date)
		}

		// Check if one of the dd/mm checks have worked
		if err == nil {
			// return t, but using the current year
			year := time.Now().Year()
			t = time.Date(year, t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
		}
	}
	return t, err
}

// FormatDate formats a time.Time into date in a standardised format
func FormatDate(t time.Time) string {
	return t.Format("Mon, 02 Jan 2006")
}

// FormatTime formats a time.Time into a time in a standardised format
func FormatTime(t time.Time) string {
	return t.Format("03:04PM")
}

// FormatTimeDate formats a time.Time into a full time and date, in a standardised format
func FormatTimeDate(t time.Time) string {
	return fmt.Sprintf("%s, %s", FormatTime(t), FormatDate(t))
}

// TimeInfo returns the time info of an Event in a readable format with duplicate info minimised
func (event Event) TimeInfo() string {
	// Ignores the case of "All Day" events, because there are none in database and I don't know how they're represented
	// If the start and end of an event is on the same day, then the date is only stated once, with both start and
	//   end times.
	// If the start and end of an event is on different days, then both dates and both times are stated
	start := ParseJSONDate(event.Start)
	end := ParseJSONDate(event.End)
	y1, m1, d1 := start.Date()
	y2, m2, d2 := end.Date()

	if y1 == y2 && m1 == m2 && d1 == d2 {
		return fmt.Sprintf("%s to %s, %s", FormatTime(start), FormatTime(end), FormatDate(start))
	}
	return fmt.Sprintf("%s to %s", FormatTimeDate(start), FormatTimeDate(end))
}

// SpaceName returns the (capitalised) name of each Space. Case 4 (Prototyping Studio) unused and omitted.
func SpaceName(facilityID int) string {
	switch facilityID {
	case 0:
		return TR1
	case 1:
		return TR2
	case 2:
		return CTPH
	case 3:
		return AMPH
	case 5:
		return CHATTER
	default:
		panic(fmt.Sprintf("ERROR: SpaceName(facilityID int) expects {0,1,2,3,5} but received %d", facilityID))
	}
}

// toString displays info associated with one particular Event booking.
func (event Event) toString() string {
	return fmt.Sprintf("%s\n%s", event.Title, event.TimeInfo())
}

//toString displays info for all bookings in a Space.
func (space Space) toString() string {
	returnString := ""
	if len(space) == 0 {
		returnString += "[No bookings recorded]"
	} else {
		for i := range space {
			if i != 0 {
				returnString += "\n\n"
			}
			returnString += (space)[i].toString()
		}
	}
	return returnString
}

// ToString displays all info for each Space in Spaces, with a subheader for each Space.
func (spaces Spaces) toString() string {
	spacesString := ""

	for _, i := range []int{0, 1, 2, 3, 5} {
		if i != 0 {
			spacesString += "\n\n\n"
		}
		spacesString += fmt.Sprintf("=======================\n%s\n=======================\n%s",
			SpaceName(i), (spaces)[i].toString())
	}
	return spacesString
}

// EventPredicate is a predicate function for use with Restrict.
type EventPredicate func(Event) bool

// Restrict returns a new Spaces object containing all events in the original Spaces for which predicate returns true.
func (spaces Spaces) Restrict(predicate EventPredicate) Spaces {
	newSpaces := Spaces{}
	for i, space := range spaces {
		newSpaces = append(newSpaces, Space{})
		for _, event := range space {
			if predicate(event) {
				newSpaces[i] = append(newSpaces[i], event)
			}
		}
	}
	return newSpaces
}

// EventNow is an EventPredicate testing if current time falls between start and end time of the Event.
func eventNow(event Event) bool {
	now := time.Now()
	start := ParseJSONDate(event.Start)
	end := ParseJSONDate(event.End)
	return start.Before(now) && now.Before(end)
}

// EventOnDay is an EventPredicate testing if any part of an Event falls on the same day as the specified time.Time.
func eventOnDay(t time.Time) func(Event) bool {
	y, m, d := t.Date()
	return func(event Event) bool {
		start := ParseJSONDate(event.Start)
		end := ParseJSONDate(event.End)
		sy, sm, sd := start.Date()
		ey, em, ed := end.Date()
		return (eventNow(event) || (y == sy && m == sm && d == sd) || (y == ey && m == em && d == ed))
	}
}

// EventToday is an EventPredicate testing if any part of an Event overlaps with the current day.
func eventToday(event Event) bool {
	return eventOnDay(time.Now())(event)
}

// EventBefore tests if any part of an Event falls before a given time.Time. It is NOT an EventPredicate.
func eventBefore(event Event, t time.Time) bool {
	start := ParseJSONDate(event.Start)
	return start.Before(t)
}

// EventAfter tests if any part of an Event falls after a given time.Time. It is NOT an EventPredicate.
func eventAfter(event Event, t time.Time) bool {
	end := ParseJSONDate(event.End)
	return end.After(t)
}

// EventComingWeek is an EventPredicate testing if an Event overlaps with the time period of (now, now + 7 days)
func eventComingWeek(event Event) bool {
	now := time.Now()
	week := now.AddDate(0, 0, 7)
	return eventAfter(event, now) && eventBefore(event, week)
}

// EventBetweenDays returns an EventPredicate testing if an event falls between the start and end date, inclusive.
// It is meant to be called with start, end time.Time obtained from ParseDDMMYYDate, which by default has time = 12MN.
func EventBetweenDays(start, end time.Time) func(Event) bool {
	correctedEnd := end.AddDate(0, 0, 1) // Standard is 12AM, so 1 day is added to capture events on the last day
	return func(event Event) bool {
		return eventAfter(event, start) && eventBefore(event, correctedEnd)
	}
}

// BookingsTodayMessage returns a string describing all bookings today.
func (spaces Spaces) bookingsTodayMessage() string {
	message := fmt.Sprintf("Displaying bookings for today:\n\n")
	message += spaces.Restrict(eventToday).ToString()
	return message
}

// BookingsNowMessage returns a string describing all bookings active this moment.
func (spaces Spaces) bookingsNowMessage() string {
	message := fmt.Sprintf("Displaying bookings ongoing right now (%s):\n\n", FormatTimeDate(time.Now()))
	message += spaces.Restrict(eventNow).ToString()
	return message
}

// BookingsComingWeekMessage returns a string describing bookings within 7 days.
func (spaces Spaces) bookingsComingWeekMessage() string {
	message := "Displaying bookings within 7 days from now:\n\n"
	message += spaces.Restrict(eventComingWeek).ToString()
	return message
}

// BookingsOnDate returns a string describing bookings on the same day as the given time.Time.
func (spaces Spaces) bookingsOnDate(t time.Time) string {
	message := fmt.Sprintf("Displaying bookings on %s:\n\n", FormatDate(t))
	message += spaces.Restrict(eventOnDay(t)).ToString()
	return message
}

// BookingsBetween returns a string describing bookings in the given interval.
func (spaces Spaces) bookingsBetween(start, end time.Time) string {
	message := fmt.Sprintf("Displaying bookings between %s and %s\n\n", FormatDate(start), FormatDate(end))
	message += spaces.Restrict(EventBetweenDays(start, end)).ToString()
	return message
}

//Spaces is the primary Cinnabot Spaces method that the end user interacts with.
//	"/spaces" displays bookings for today.
//	"/spaces now" displays bookings right this moment.
//	"/spaces week" displays bookings in the next 7 days.
//	"/spaces dd/mm/yy" displays bookings on the given date.
//	"/spaces dd/mm/yy dd/mm/yy" displays bookings in the given interval (limited to one month++).
//	"/spaces help" informs the user of available commands.
//
//	Extra arguments are ignored.
//	Unparseable commands return the help menu.
func (cb *Cinnabot) Spaces(msg *message) {
	toSend := ""
	spaces := getSpaces()
	if len(msg.Args) == 0 {
		toSend += spaces.bookingsTodayMessage()
	} else if msg.Args[0] == "now" {
		toSend += spaces.bookingsNowMessage()
	} else if msg.Args[0] == "week" {
		toSend += spaces.bookingsComingWeekMessage()
	} else if msg.Args[0] == "today" {
		toSend += spaces.bookingsTodayMessage()
	} else if msg.Args[0] == "tomorrow" {
		today := time.Now()
		tomorrow := today.AddDate(0, 0, 1)
		toSend += spaces.bookingsOnDate(tomorrow)
	} else {
		t0, err0 := ParseDDMMYYDate(msg.Args[0])
		if err0 == nil {
			// First argument is a valid date
			// Attempt to parse second argument, if exists, and show BookingsBetween(t0, t1)
			if len(msg.Args) >= 2 {
				t1, err1 := ParseDDMMYYDate(msg.Args[1])
				if err1 == nil {
					// Check if the interval is too long
					if t0.AddDate(0, 0, 33).Before(t1) {
						toSend += "The time interval is too long. Please restrict it to at most one month."
					} else {
						toSend += spaces.bookingsBetween(t0, t1)
					}
				}
			}

			if toSend == "" {
				// i.e., second argument does not exist or failed to parse as date
				// Just show events on date t0
				toSend += spaces.bookingsOnDate(t0)
			}
		}
	}

	if toSend == "" {
		// i.e., if arguments could not be parsed as above
		if msg.Args[0] != "help" {
			toSend += "Cinnabot was unable to understand your command.\n\n"
		}

		toSend += "To use the '/spaces' command, type one of the following:\n'/spaces' : to view all bookings for today\n'/spaces now' : to view bookings active at this very moment\n'/spaces week' : to view all bookings for this week\n'/spaces dd/mm(/yy)' : to view all bookings on a specific day\n'/spaces dd/mm(/yy) dd/mm(/yy)' : to view all bookings in a specific range of dates"
	}

	cb.SendTextMessage(msg.From.ID, toSend)
}