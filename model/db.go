package model

import (
	"github.com/jinzhu/gorm"
	"log"
	"strings"
	"errors"
)

//For dependency injection
type DataGroup interface {
	Add(value interface{})
	UserGroup(tags []string) []User
	CheckTagExists (id int, tag string) bool
	CheckSubscribed (id int, tag string) bool
	UpdateTag (id int, tag string, flag string) error

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

	database := &Database{db}

	return database
}

func (db *Database) Add(value interface{}) {
	db.Create(value)
}


//CheckTagExists takes in an id and a tag and returns whether the tag exists
func (db *Database) CheckTagExists (id int, tag string) bool {
	check := db.Where("user_id = ?", id)
	var usr User
	if err2 := check.Where(tag+" = ?", "placebo").First(&usr).Error; err2 != gorm.ErrRecordNotFound {
		if strings.Contains(err2.Error(), "no such column") {
			return false
		}

		log.Fatal(err2)
		return false
	}
	log.Print("1: True")
	return true
}

//CheckSubscribed takes in an id and a tag and returns true if user is subscribed, false otherwise
func (db *Database) CheckSubscribed (id int, tag string) bool{
	check := db.Where("user_id = ?", id)
	var usr User
	if err := check.Where(tag + " = ?", "true").First(&usr).Error; err != gorm.ErrRecordNotFound {
		return true
	}
	log.Print("2: True")
	return false
}



//Update updates the flag for the tag for an User which is determined by the id
func (db *Database) UpdateTag (id int, tag string, flag string) error{
	check := db.Where("user_id = ?", id)
	var usr User
	bannedFields := []string{"user_id", "created_at", "deleted_at"}
	for _,field := range bannedFields {
		if field == tag {
			return errors.New("banned field")
		}
	}
	log.Print(id)
	check.First(&usr,id)
	log.Print(usr)

	if err := check.Model(&usr).Update(tag, flag).Error; err != nil {
		return err
	}

	log.Print("3: True")
	return nil
}




