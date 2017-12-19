package model

import (
	"github.com/jinzhu/gorm"
	"log"
)

type DataGroup interface {
	UserGroup() ([]*User, error)
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


