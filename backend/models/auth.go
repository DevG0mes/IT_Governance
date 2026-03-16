package models

import "time"

type User struct {
	ID              uint   `gorm:"primaryKey" json:"id"`
	Nome            string `json:"nome"`
	Email           string `gorm:"unique" json:"email"`
	Senha           string `json:"senha"`
	Cargo           string `json:"cargo"`
	PermissionsJSON string `gorm:"type:text" json:"permissions_json"`
}

type AuditLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Timestamp time.Time `gorm:"autoCreateTime" json:"timestamp"`
	User      string    `json:"user"`
	Action    string    `json:"action"`
	Module    string    `json:"module"`
	Details   string    `json:"details"`
}

// Força o nome das tabelas no banco de dados
func (User) TableName() string { return "users" }
func (AuditLog) TableName() string { return "audit_logs" }