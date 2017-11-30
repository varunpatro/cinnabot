package model

import (
	"github.com/jinzhu/gorm"
)

type User struct {
	gorm.Model
	UserID    int
	FirstName string
	LastName  string
	UserName  string
}
