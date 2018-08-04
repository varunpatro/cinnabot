package model

import (
	"time"

	"github.com/jinzhu/gorm"
)

// User is an ORM compatible struct that serializes a telegram user's information.
type User struct {
	UserID     int `gorm:"primary_key"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
	FirstName  string
	LastName   string
	UserName   string
	Everything string //`sql:"default:'false'"`
	Events     string //`sql:"default:'false'"`
	Food       string
	Warm       string
	Weather    string
}

//UserGroup returns an array of User that is true for an array of tags
func (db *Database) UserGroup(tags []string) []User {

	if len(tags) == 0 {
		return nil
	}

	rows, _ := gorm.Open("sqlite3", "../main/cinnabot.db")
	defer rows.Close()
	//Returns EVERYONE if all is used
	if tags[0] == "all" {
		var users []User
		rows.Find(&users)
		return users
	}

	for i := 0; i < len(tags); i++ {
		rows = rows.Where(tags[i]+" = ?", "true")
	}
	rows = rows.Or("everything = ?", "true")

	var users []User
	rows.Find(&users)

	return users
}
