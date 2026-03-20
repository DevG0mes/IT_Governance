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
	Observacao      string                `gorm:"column:observacao" json:"observacao"`

	// O "CASCADE" garante que deletar um Ativo limpe também os dados das tabelas filhas no PostgreSQL
	Notebook        *AssetNotebook        `gorm:"foreignKey:AssetID;constraint:OnDelete:CASCADE" json:"notebook,omitempty"`
	Starlink        *AssetStarlink        `gorm:"foreignKey:AssetID;constraint:OnDelete:CASCADE" json:"starlink,omitempty"`
	Chip            *AssetChip            `gorm:"foreignKey:AssetID;constraint:OnDelete:CASCADE" json:"chip,omitempty"`
	Celular         *AssetCelular         `gorm:"foreignKey:AssetID;constraint:OnDelete:CASCADE" json:"celular,omitempty"`
	MaintenanceLogs []AssetMaintenanceLog `gorm:"foreignKey:AssetID;constraint:OnDelete:CASCADE" json:"maintenance_logs"`
	Assignments     []AssetAssignment     `gorm:"foreignKey:AssetID;constraint:OnDelete:CASCADE" json:"assignments"`
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
	ID            uint   `gorm:"primaryKey;column:id" json:"id"`
	AssetID       uint   `gorm:"column:asset_id" json:"asset_id"`
	Modelo        string `gorm:"column:modelo" json:"modelo"`
	Grupo         string `gorm:"column:grupo" json:"grupo"`
	Localizacao   string `gorm:"column:localizacao" json:"localizacao"`
	Responsavel   string `gorm:"column:responsavel" json:"responsavel"`
	Email         string `gorm:"column:email" json:"email"`
	Senha         string `gorm:"column:senha" json:"senha"`
	SenhaRoteador string `gorm:"column:senha_roteador" json:"senha_roteador"`
	Projeto          string `gorm:"column:projeto" json:"projeto"`
    EmailResponsavel string `gorm:"column:email_responsavel" json:"email_responsavel"`
}

type AssetCelular struct {
	ID          uint   `gorm:"primaryKey;column:id" json:"id"`
	AssetID     uint   `gorm:"column:asset_id" json:"asset_id"`
	IMEI        string `gorm:"column:imei" json:"imei"`
	Modelo      string `gorm:"column:modelo" json:"modelo"`
	Grupo       string `gorm:"column:grupo" json:"grupo"`
	Responsavel string `gorm:"column:responsavel" json:"responsavel"`
}

type AssetChip struct {
	ID          uint   `gorm:"primaryKey;column:id" json:"id"`
	AssetID     uint   `gorm:"column:asset_id" json:"asset_id"`
	Numero      string `gorm:"column:numero" json:"numero"`
	ICCID       string `gorm:"column:iccid" json:"iccid"`
	Plano       string `gorm:"column:plano" json:"plano"`
	Grupo       string `gorm:"column:grupo" json:"grupo"`
	Responsavel string `gorm:"column:responsavel" json:"responsavel"`
}

type License struct {
	ID               uint              `gorm:"primaryKey;column:id" json:"id"`
	Nome             string            `gorm:"column:nome" json:"nome"`
	Fornecedor       string            `gorm:"column:fornecedor" json:"fornecedor"`
	Plano            string            `gorm:"column:plano" json:"plano"`
	Custo            float64           `gorm:"column:custo" json:"custo"`
	QuantidadeTotal  int               `gorm:"column:quantidade_total" json:"quantidade_total"`
	QuantidadeEmUso  int               `gorm:"column:quantidade_em_uso" json:"quantidade_em_uso"`
	DataRenovacao    string            `gorm:"column:data_renovacao" json:"data_renovacao"`
	CreatedAt        time.Time         `gorm:"column:created_at" json:"created_at"`
	UpdatedAt        time.Time         `gorm:"column:updated_at" json:"updated_at"`
	EmployeeLicenses []EmployeeLicense `gorm:"foreignKey:LicenseID;constraint:OnDelete:CASCADE" json:"assignments,omitempty"`
}

type EmployeeLicense struct {
	ID         uint      `gorm:"primaryKey;column:id" json:"id"`
	EmployeeID uint      `gorm:"column:employee_id" json:"employee_id"`
	LicenseID  uint      `gorm:"column:license_id" json:"license_id"`
	AssignedAt time.Time `gorm:"column:assigned_at" json:"assigned_at"`
	Employee   *Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	License    *License  `gorm:"foreignKey:LicenseID" json:"license,omitempty"`
}

type Employee struct {
	ID                 uint              `gorm:"primaryKey;column:id" json:"id"`
	Nome               string            `gorm:"column:nome" json:"nome"`
	Email              string            `gorm:"column:email" json:"email"`
	Departamento       string            `gorm:"column:departamento" json:"departamento"`
	Notebook           string            `gorm:"column:notebook" json:"notebook"`
	Chip               string            `gorm:"column:chip" json:"chip"`
	Status             string            `gorm:"column:status;default:'Ativo'" json:"status"`
	TermoUrl           string            `gorm:"column:termo_url" json:"termo_url"`
	OffboardingOnfly   bool              `gorm:"column:offboarding_onfly" json:"offboarding_onfly"`
	OffboardingAdm365  bool              `gorm:"column:offboarding_adm365" json:"offboarding_adm365"`
	OffboardingLicense bool              `gorm:"column:offboarding_license" json:"offboarding_license"`
	OffboardingMega    bool              `gorm:"column:offboarding_mega" json:"offboarding_mega"`
	OffboardingDate    *time.Time        `gorm:"column:offboarding_date" json:"offboarding_date"`
	CreatedAt          time.Time         `gorm:"column:created_at" json:"created_at"`
	UpdatedAt          time.Time         `gorm:"column:updated_at" json:"updated_at"`
	AssignedLicenses   []EmployeeLicense `gorm:"foreignKey:EmployeeID;constraint:OnDelete:CASCADE" json:"assigned_licenses,omitempty"`
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

type Contract struct {
	ID             uint      `gorm:"primaryKey;column:id" json:"id"`
	Servico        string    `gorm:"column:servico" json:"servico"`
	Fornecedor     string    `gorm:"column:fornecedor" json:"fornecedor"`
	MesCompetencia string    `gorm:"column:mes_competencia" json:"mes_competencia"`
	ValorPrevisto  float64   `gorm:"column:valor_previsto" json:"valor_previsto"`
	ValorRealizado float64   `gorm:"column:valor_realizado" json:"valor_realizado"`
	UrlContrato    string    `gorm:"column:url_contrato" json:"url_contrato"`
	CreatedAt      time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Asset) TableName() string               { return "assets" }
func (AssetNotebook) TableName() string       { return "asset_notebooks" }
func (AssetStarlink) TableName() string       { return "asset_starlinks" }
func (AssetChip) TableName() string           { return "asset_chips" }
func (AssetCelular) TableName() string        { return "asset_celulares" }
func (Employee) TableName() string            { return "employees" }
func (AssetAssignment) TableName() string     { return "asset_assignments" }
func (AssetMaintenanceLog) TableName() string { return "asset_maintenance_logs" }
func (License) TableName() string             { return "licenses" }
func (EmployeeLicense) TableName() string     { return "employee_licenses" }
func (Contract) TableName() string            { return "contracts" }