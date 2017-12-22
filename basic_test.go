package cinnabot

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/mock"
	"gopkg.in/telegram-bot-api.v4"
	"io/ioutil"
	"io"

	"github.com/varunpatro/cinnabot/model"

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
			Location: &tgbotapi.Location{
				Latitude:1.31760778241046,
				Longitude:103.76768583722071,
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

//Bus Timings should be tested in three phases
//1. Pop three closest busstops according to location
//2. The right format
//3. HTTP request works

//TestBus tests the format of the response string.
func TestBus(t *testing.T) {
	mb := mockBot{}
	cb := Cinnabot{
		bot: &mb,
	}

	BSH := getBusStops(*mockMsg.Location)
	oldgetBusStops := getBusStops
	defer func() {getBusStops=oldgetBusStops} ()

	getBusStops = func(loc tgbotapi.Location) (BusStopHeap) {
		return BSH
	}

	oldreadall := ioutil.ReadAll
	defer func() { ioutil.ReadAll = oldreadall} ()

	//Simulates with a default response @ busStop code 19059
	ioutil.ReadAll = func(r io.Reader) ([]byte, error) {
		responseText := "{\"odata.metadata\":\"http://datamall2.mytransport.sg/ltaodataservice/$metadata#BusArrivalv2/" +
			"@Element\",\"BusStopCode\":\"42109\",\"Services\":[{\"ServiceNo\":\"170\",\"Operator\":\"SBST\",\"NextBus" +
				"\":{\"OriginCode\":\"46239\",\"DestinationCode\":\"01109\",\"EstimatedArrival\":\"2017-12-22T01:38:47" +
					"+08:00\",\"Latitude\":\"1.4398775\",\"Longitude\":\"103.768522\",\"VisitNumber\":\"1\",\"Load\":\"" +
						"SEA\",\"Feature\":\"WAB\",\"Type\":\"SD\"},\"NextBus2\":{\"OriginCode\":\"\",\"DestinationCode\"" +
							":\"\",\"EstimatedArrival\":\"\",\"Latitude\":\"\",\"Longitude\":\"\",\"VisitNumber\":\"\",\"" +
								"Load\":\"\",\"Feature\":\"\",\"Type\":\"\"},\"NextBus3\":{\"OriginCode\":\"\",\"Destin" +
									"ationCode\":\"\",\"EstimatedArrival\":\"\",\"Latitude\":\"\",\"Longitude\":\"\",\"V" +
										"isitNumber\":\"\",\"Load\":\"\",\"Feature\":\"\",\"Type\":\"\"}}]}"
		return []byte(responseText), nil
	}

	expectedMsgStr := "Opp Beauty World Ctr\n================\nBus 170 : 25 minutes\n\nOpp Beauty World Ctr\n=======" +
		"=========\nBus 170 : 25 minutes\n\nOpp Beauty World Ctr\n================\nBus 170 : 25 minutes\n\n"
	expectedMsg := tgbotapi.NewMessage(999, expectedMsgStr)
	mb.On("Send", expectedMsg).Return(nil)
	cb.BusTimings(&mockMsg)
}

//Test Weather tests format of output
func TestWeather(t *testing.T) {
	mb := mockBot{}
	cb := Cinnabot{
		bot: &mb,
	}
	oldreadall := ioutil.ReadAll
	defer func() { ioutil.ReadAll = oldreadall} ()

	//Simulates with a default response

	ioutil.ReadAll = func(r io.Reader) ([]byte, error) {
		responseText := "{\"area_metadata\":[{\"name\":\"Bukit Batok\",\"label_location\":{\"latitude\":1.353,\"" +
			"longitude\":103.754}},{\"name\":\"Bukit Merah\",\"label_location\":{\"latitude\":1.277,\"longitude\":103.8" +
				"19}},{\"name\":\"Bukit Panjang\",\"label_location\":{\"latitude\":1.362,\"longitude\":103.77195}},{\"n" +
					"ame\":\"Bukit Timah\",\"label_location\":{\"latitude\":1.325,\"longitude\":103.791}},{\"name\":\"C" +
						"entral Water Catchment\",\"label_location\":{\"latitude\":1.38,\"longitude\":103.805}},{\"nam" +
							"e\":\"Changi\",\"label_location\":{\"latitude\":1.357,\"longitude\":103.987}},{\"name\":\"" +
								"Choa Chu Kang\",\"label_location\":{\"latitude\":1.377,\"longitude\":103.745}},{\"name" +
									"\":\"Clementi\",\"label_location\":{\"latitude\":1.315,\"longitude\":103.76}},{" +
										"\"name\":\"City\",\"label_location\":{\"latitude\":1.292,\"longitude\":1" +
											"03.844}},{\"name\":\"Geylang\",\"label_location\":{\"latitude\":1.318" +
												",\"longitude\":103.884}},{\"name\":\"Hougang\",\"label_location\":{\"" +
													"latitude\":1.361218,\"longitude\":103.886}},{\"name\":\"Jalan " +
														"Bahar\",\"label_location\":{\"latitude\":1.347,\"longitude\"" +
															":103.67}}}],\"items\":[{\"update_timestamp\":\"2017-12-" +
																"22T15:41:18+08:00\",\"timestamp\":\"2017-12-22T15:00:" +
																	"00+08:00\",\"valid_period\":{\"start\":\"2017-12-" +
																		"22T15:00:00+08:00\",\"end\":\"2017-12-22T17:0" +
																			"0:00+08:00\"},\"forecasts\":[{\"area\":\"" +
																				"Bukit Batok\",\"forecast\":\"Partly " +
																					"Cloudy (Day)\"},{\"area\":\"Bukit" +
																						" Merah\",\"forecast\":\"Partl" +
																							"y Cloudy (Day)\"},{\"area" +
																								"\":\"Bukit Panjang\"," +
																									"\"forecast\":\"Par" +
																										"tly Cloudy (Da" +
																											"y)\"},{\"a" +
																												"rea\":\"" +
																													"Buk" +
																														"it Timah\",\"forecast\":\"Partly Cloudy (Day)\"},{\"area\":\"Central Water Catchment\",\"forecast\":\"Partly Cloudy (Day)\"},{\"area\":\"Changi\",\"forecast\":\"Light Showers\"},{\"area\":\"Choa Chu Kang\",\"forecast\":\"Partly Cloudy (Day)\"},{\"area\":\"Clementi\",\"forecast\":\"Partly Cloudy (Day)\"},{\"area\":\"City\",\"forecast\":\"Light Showers\"},{\"area\":\"Geylang\",\"forecast\":\"Light Showers\"},{\"area\":\"Hougang\",\"forecast\":\"Light Showers\"},{\"area\":\"Jalan Bahar\",\"forecast\":\"Partly Cloudy (Day)\"}}"
		return []byte(responseText), nil
	}

	expectedMsgStr := "🤖 The forecast is Partly Cloudy (Day) for Clementi"
	expectedMsg := tgbotapi.NewMessage(999, expectedMsgStr)
	mb.On("Send", expectedMsg).Return(nil)
	cb.BusTimings(&mockMsg)

}

//MockDB used to test broadcast and subscribe.
type mockDB struct {}

//Helpers that all mockbot has to implement to inherit DataGroup
func (mdb *mockDB) Create(value interface{}) {}
//NOTE: only arguments with single tag for simplicity
func (mdb *mockDB) UserGroup (tags []string) []model.User {
	user1 := model.User{
		UserID: 0001,
		Everything: true,
		Events: true,
	}
	user2 := model.User{
		UserID: 0002,
		Everything: false,
		Events: true,
	}
	user3 := model.User{
		UserID: 0001,
		Everything: true,
		Events: false,
	}
	if tags == nil {
		return []model.User{user1,user2,user3}
	}
	for _,tag := range tags {
		if tag == "everything" {
			return []model.User{user1, user2, user3}
		}
		if tag == "events" {
			return []model.User{user2, user3}
		}
	}
}

//CheckTagExists takes in an id and a tag and returns whether the tag exists
func (mdb *mockDB) CheckTagExists (id int, tag string) bool {
	return true
}

//CheckSubscribed takes in an id and a tag and returns true if user is subscribed, false otherwise
func (mdb *mockDB) CheckSubscribed (id int, tag string) bool{
	return false
}



//Update updates the flag for the tag for an User which is determined by the id
func (mdb *mockDB) UpdateTag (id int, tag string, flag bool) error{
	return nil
}

/**
//Two ways to test broadcast
//1. Ensure that a reply mock-up is sent when an empty message is sent
//2. Test that the right individuals are called up [database]
//3. Ensure that the individuals receive the right messages
func TestBroadcast(t *testing.T) {
	mb := mockBot{}
	cb := Cinnabot{
		bot: &mb,
	}
	//Mock Msg requires a mock-up
	replyMessage := &tgbotapi.Message{
		Text: "/broadcast everything",
	}
	mockMsgBroadcast := message{
		Message: &tgbotapi.Message{
			MessageID: 1,
			From: &tgbotapi.User{
				ID:        999,
				FirstName: "test_first_name_user",

			},
			Location: &tgbotapi.Location{
				Latitude:1.31760778241046,
				Longitude:103.76768583722071,
			},
			Text: "Test Message",
			ReplyToMessage:replyMessage,

		},

	}
	mdb := mockDB{}

	oldinit := model.InitializeDB
	model.InitializeDB = func () *gorm.DB {
		return
	}
	//Potential problem: a text of forwarded message might not match expected message
	expectedMsg:= "Test Message"
	mb.On("Send", expectedMsg).Return(nil)
	cb.Broadcast(&mockMsgBroadcast)
}

func TestSubscribe(t *testing.T) {

}
*/