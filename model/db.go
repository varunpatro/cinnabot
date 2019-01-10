package model

import (
	"errors"
	"log"
	"strings"
	"time"

	"github.com/jinzhu/gorm"
)

//For dependency injection
type DataGroup interface {
	Add(value interface{})
	UserGroup(tags []string) []User
	CheckTagExists(id int, tag string) bool
	CheckSubscribed(id int, tag string) bool
	UpdateTag(id int, tag string, flag string) error
	CountUsersAndMessages(period string) (int, int)
	GetMostUsedCommand(period string) string
}

type Database struct {
	*gorm.DB
}

// InitializeDB initializes DB
func InitializeDB() *Database {
	db, err := gorm.Open("sqlite3", "./cinnabot.db")
	if err != nil {
		log.Fatalf("error in initializing db %s", err)
	}

	if !db.HasTable(Message{}) {
		db.CreateTable(Message{})
	}

	if !db.HasTable(User{}) {
		db.CreateTable(User{})
	}

	if !db.HasTable(Feedback{}) {
		db.CreateTable(Feedback{})
	}

	database := &Database{db}

	return database
}

func (db *Database) Add(value interface{}) {
	db.Create(value)
}

//CheckTagExists takes in an id and a tag and returns whether the tag exists
func (db *Database) CheckTagExists(id int, tag string) bool {
	check := db.Where("user_id = ?", id)
	var usr User
	if err2 := check.Where(tag+" = ?", "placebo").First(&usr).Error; err2 != gorm.ErrRecordNotFound {
		if strings.Contains(err2.Error(), "no such column") {
			return false
		}

		log.Print(err2)
		return false
	}
	log.Print("1: True")
	return true
}

//CheckSubscribed takes in an id and a tag and returns true if user is subscribed, false otherwise
func (db *Database) CheckSubscribed(id int, tag string) bool {
	check := db.Where("user_id = ?", id)
	var usr User
	if err := check.Where(tag+" = ?", "true").First(&usr).Error; err != gorm.ErrRecordNotFound {
		return true
	}
	log.Print("2: True")
	return false
}

//Update updates the flag for the tag for an User which is determined by the id
func (db *Database) UpdateTag(id int, tag string, flag string) error {
	check := db.Where("user_id = ?", id)
	var usr User
	bannedFields := []string{"user_id", "created_at", "deleted_at"}
	for _, field := range bannedFields {
		if field == tag {
			return errors.New("banned field")
		}
	}
	log.Print(id)
	check.First(&usr, id)
	log.Print(usr)

	if err := check.Model(&usr).Update(tag, flag).Error; err != nil {
		return err
	}

	log.Print("3: True")
	return nil
}

// Get number of users from database
func (db *Database) CountUsersAndMessages(period string) (int, int) {
	var countUsers, countMessages int
	if period == "forever" {
		db.Table("users").Count(&countUsers)
		db.Table("messages").Count(&countMessages)
		return countUsers, countMessages
	}
	var timeSince string
	switch period {
	case "week":
		timeSince = time.Now().Local().AddDate(0, 0, -8).Format("2006-01-02")
	case "month":
		timeSince = time.Now().Local().AddDate(0, -1, -1).Format("2006-01-02")
	case "year":
		timeSince = time.Now().Local().AddDate(-1, 0, -1).Format("2006-01-02")
	}
	db.Table("users").Where("created_at > ?", timeSince).Count(&countUsers)
	db.Table("messages").Where("created_at > ?", timeSince).Count(&countMessages)
	return countUsers, countMessages
}

// function to get most used command
func (db *Database) GetMostUsedCommand(period string) string {
	var msg Message
	if period == "forever" {
		db.Table("messages").Select("*").Group("text").Having("text like ?", "/%").
			Order("count(text)").Scan(&msg)
		return msg.Text
	}
	var timeSince string
	switch period {
	case "week":
		timeSince = time.Now().Local().AddDate(0, 0, -8).Format("2006-01-02")
	case "month":
		timeSince = time.Now().Local().AddDate(0, -1, -1).Format("2006-01-02")
	case "year":
		timeSince = time.Now().Local().AddDate(-1, 0, -1).Format("2006-01-02")
	}
	db.Table("messages").Select("*").Group("text").Having("text like ?", "/%").
		Having("created_at > ?", timeSince).Order("count(text)").Scan(&msg)
	return msg.Text
}
