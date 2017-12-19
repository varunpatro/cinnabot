package model

import (
	"github.com/jinzhu/gorm"

	"time"
)

// User is an ORM compatible struct that serializes a telegram user's information.
type User struct {
	UserID int `gorm:"primary_key"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletetedAt time.Time
	FirstName string
	LastName  string
	UserName  string
	Everything bool `gorm:"default:'false'"`
	Events bool `gorm:"default:'false'"`

}

func (db *Database) UserGroup (tags []string) []User {

	if len(tags) == 0 {
		return nil
	}
	rows, _ := gorm.Open("sqlite3", "../main/cinnabot.db")
	defer rows.Close()
	rows = rows.Where("everything = ?", true)

	for i:=0;i<len(tags);i++ {
		rows = rows.Where(tags[i]+" = ?",true)
	}
	var users []User
	rows.Find(&users)


	return users
}