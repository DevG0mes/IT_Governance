package models

type CatalogItem struct {
	ID       uint    `gorm:"primaryKey;column:id" json:"id"`
	Category string  `gorm:"column:category" json:"category"` // Notebook, Celular, CHIP, Starlink
	Nome     string  `gorm:"column:nome" json:"nome"`         // Ex: Dell Latitude 5420 ou Plano Vivo 50GB
	Valor    float64 `gorm:"column:valor" json:"valor"`       // Preço de compra ou custo mensal
}