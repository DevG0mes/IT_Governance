package models

import "time"

type User struct {
	ID              uint      `gorm:"primaryKey;column:id" json:"id"`
	Nome            string    `gorm:"column:nome" json:"nome"`
	Email           string    `gorm:"unique;column:email" json:"email"`
	Senha           string    `gorm:"column:senha" json:"senha"`
	Cargo           string    `gorm:"column:cargo" json:"cargo"`
	PermissionsJSON string    `gorm:"column:permissions_json;type:text" json:"permissions_json"`
	CreatedAt       time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt       time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName define o nome da tabela no plural para o GORM
func (User) TableName() string {
	return "users"
}