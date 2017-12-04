package model

import (
	"github.com/jinzhu/gorm"
)

// User is an ORM compatible struct that serializes a telegram user's information.
type User struct {
	gorm.Model
	UserID    int
	FirstName string
	LastName  string
	UserName  string
}
