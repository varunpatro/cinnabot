package model

import (
	"github.com/jinzhu/gorm"

	"time"
	"strings"
	"log"
	"errors"
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

//UserGroup returns an array of User that is true for an array of tags
func (db *Database) UserGroup (tags []string) []User {

	if len(tags) == 0 {
		return nil
	}
	rows, _ := gorm.Open("sqlite3", "../main/cinnabot.db")
	defer rows.Close()

	for i:=0;i<len(tags);i++ {
		rows = rows.Where(tags[i]+" = ?",true)
	}
	rows = rows.Or("everything = ?", true)

	var users []User
	rows.Find(&users)


	return users
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
	return true
}

//CheckSubscribed takes in an id and a tag and returns true if user is subscribed, false otherwise
func (db *Database) CheckSubscribed (id int, tag string) bool{
	check := db.Where("user_id = ?", id)
	var usr User
	if err := check.Where(tag + " = ?", true).First(&usr).Error; err != gorm.ErrRecordNotFound {
		return true
	}
	return false
}



//Update updates the flag for the tag for an User which is determined by the id
func (db *Database) UpdateTag (id int, tag string, flag bool) error{
	check := db.Where("user_id = ?", id)
	var usr User
	bannedFields := []string{"user_id", "created_at", "deleted_at"}
	for _,field := range bannedFields {
		if field == tag {
			return errors.New("banned field")
		}
	}
	if err := check.Model(&usr).Update(tag, flag).Error; err != nil {
		return err
	}
	return nil
}
