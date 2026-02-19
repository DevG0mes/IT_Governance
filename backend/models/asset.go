package models

import (
	"time"
)

type AssetStatus string

const (
	StatusDisponivel AssetStatus = "Disponível"
	StatusEmUso      AssetStatus = "Em uso"
	StatusManutencao AssetStatus = "Manutenção"
	StatusDescartado AssetStatus = "Descartado"
	StatusBloqueado  AssetStatus = "Bloqueado"
)

type Asset struct {
	ID              uint                  `gorm:"primaryKey;column:id" json:"id"`
	AssetType       string                `gorm:"column:asset_type" json:"asset_type"`
	Status          AssetStatus           `gorm:"column:status" json:"status"`
	CreatedAt       time.Time             `gorm:"column:created_at" json:"created_at"`
	UpdatedAt       time.Time             `gorm:"column:updated_at" json:"updated_at"`
	Notebook        *AssetNotebook        `gorm:"foreignKey:AssetID" json:"notebook,omitempty"`
	Starlink        *AssetStarlink        `gorm:"foreignKey:AssetID" json:"starlink,omitempty"`
	Chip            *AssetChip            `gorm:"foreignKey:AssetID" json:"chip,omitempty"`
	Celular         *AssetCelular         `gorm:"foreignKey:AssetID" json:"celular,omitempty"` // NOVO
	MaintenanceLogs []AssetMaintenanceLog `gorm:"foreignKey:AssetID" json:"maintenance_logs"`
	Assignments     []AssetAssignment     `gorm:"foreignKey:AssetID" json:"assignments"`
}

type AssetNotebook struct {
	AssetID        uint   `gorm:"primaryKey;column:asset_id" json:"asset_id"`
	SerialNumber   string `gorm:"column:serial_number" json:"serial_number"`
	Patrimonio     string `gorm:"column:patrimonio" json:"patrimonio"`
	Modelo         string `gorm:"column:modelo" json:"modelo"`
	Garantia       string `gorm:"column:garantia" json:"garantia"`
	StatusGarantia string `gorm:"column:status_garantia" json:"status_garantia"`
}

type AssetStarlink struct {
	AssetID       uint   `gorm:"primaryKey;column:asset_id" json:"asset_id"`
	Modelo        string `gorm:"column:modelo" json:"modelo"`
	Projeto       string `gorm:"column:projeto" json:"projeto"`
	Localizacao   string `gorm:"column:localizacao" json:"localizacao"`
	Email         string `gorm:"column:email" json:"email"`
	Senha         string `gorm:"column:senha" json:"senha"`
	SenhaRoteador string `gorm:"column:senha_roteador" json:"senha_roteador"`
	Responsavel   string `gorm:"column:responsavel" json:"responsavel"`
}

type AssetChip struct {
	AssetID     uint   `gorm:"primaryKey;column:asset_id" json:"asset_id"`
	ICCID       string `gorm:"column:iccid" json:"iccid"`             // ATUALIZADO
	Numero      string `gorm:"column:numero" json:"numero"`
	Responsavel string `gorm:"column:responsavel" json:"responsavel"` // NOVO
}

type AssetCelular struct {
	AssetID     uint   `gorm:"primaryKey;column:asset_id" json:"asset_id"`
	Modelo      string `gorm:"column:modelo" json:"modelo"`
	IMEI        string `gorm:"column:imei" json:"imei"`
	Responsavel string `gorm:"column:responsavel" json:"responsavel"`
}

type Employee struct {
	ID                 uint       `gorm:"primaryKey;column:id" json:"id"`
	Nome               string     `gorm:"column:nome" json:"nome"`
	Email              string     `gorm:"column:email" json:"email"`
	Departamento       string     `gorm:"column:departamento" json:"departamento"`
	Notebook           string     `gorm:"column:notebook" json:"notebook"`
	Chip               string     `gorm:"column:chip" json:"chip"`
	Licencas           string     `gorm:"column:licencas" json:"licencas"`
	Status             string     `gorm:"column:status;default:'Ativo'" json:"status"`
	TermoUrl           string     `gorm:"column:termo_url" json:"termo_url"`
	OffboardingOnfly   bool       `gorm:"column:offboarding_onfly" json:"offboarding_onfly"`
	OffboardingAdm365  bool       `gorm:"column:offboarding_adm365" json:"offboarding_adm365"`
	OffboardingLicense bool       `gorm:"column:offboarding_license" json:"offboarding_license"`
	OffboardingDate    *time.Time `gorm:"column:offboarding_date" json:"offboarding_date"`
	CreatedAt          time.Time  `gorm:"column:created_at" json:"created_at"`
	UpdatedAt          time.Time  `gorm:"column:updated_at" json:"updated_at"`
}

type AssetAssignment struct {
	ID         uint       `gorm:"primaryKey;column:id" json:"id"`
	EmployeeID uint       `gorm:"column:employee_id" json:"employee_id"`
	AssetID    uint       `gorm:"column:asset_id" json:"asset_id"`
	AssignedAt time.Time  `gorm:"column:assigned_at" json:"assigned_at"`
	ReturnedAt *time.Time `gorm:"column:returned_at" json:"returned_at"`
	Employee   *Employee  `gorm:"foreignKey:EmployeeID" json:"employee"`
}

type AssetMaintenanceLog struct {
	ID         uint       `gorm:"primaryKey;column:id" json:"id"`
	AssetID    uint       `gorm:"column:asset_id" json:"asset_id"`
	Observacao string     `gorm:"column:observacao" json:"observacao"`
	Chamado    string     `gorm:"column:chamado" json:"chamado"`
	CreatedAt  time.Time  `gorm:"column:created_at" json:"created_at"`
	ResolvedAt *time.Time `gorm:"column:resolved_at" json:"resolved_at"`
}

func (Asset) TableName() string               { return "assets" }
func (AssetNotebook) TableName() string       { return "asset_notebooks" }
func (AssetStarlink) TableName() string       { return "asset_starlinks" }
func (AssetChip) TableName() string           { return "asset_chips" }
func (AssetCelular) TableName() string        { return "asset_celulares" } // NOVO
func (Employee) TableName() string            { return "employees" }
func (AssetAssignment) TableName() string     { return "asset_assignments" }
func (AssetMaintenanceLog) TableName() string { return "asset_maintenance_logs" }