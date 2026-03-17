package models

import "time"

type AuditLog struct {
	ID        uint      `gorm:"primaryKey;column:id" json:"id"`
	Timestamp time.Time `gorm:"column:timestamp" json:"timestamp"`
	User      string    `gorm:"column:user" json:"user"`
	Action    string    `gorm:"column:action" json:"action"`
	Module    string    `gorm:"column:module" json:"module"`
	Details   string    `gorm:"column:details" json:"details"`
}

// TableName define o nome exato da tabela no banco
func (AuditLog) TableName() string {
	return "audit_logs"
}