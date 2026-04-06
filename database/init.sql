-- GovTI (PSI Energy) - PostgreSQL schema (aderente aos Models/Controllers atuais)
-- Observação: o projeto usa Sequelize, mas este init.sql serve como baseline para provisionar o banco.

SET TIME ZONE 'UTC';

-- =========================
-- 1) USERS (Acessos)
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  cargo VARCHAR(50) DEFAULT 'Support',
  "permissionsJSON" TEXT
);

-- =========================
-- 2) EMPLOYEES (Colaboradores)
-- =========================
CREATE TABLE IF NOT EXISTS employees (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  departamento VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Ativo',
  -- legado (mantido pois o backend ainda escreve)
  notebook VARCHAR(100),
  chip VARCHAR(100),
  -- offboarding enterprise
  termo_url VARCHAR(500),
  offboarding_onfly INTEGER DEFAULT 0,
  offboarding_adm365 INTEGER DEFAULT 0,
  offboarding_license INTEGER DEFAULT 0,
  offboarding_mega INTEGER DEFAULT 0,
  offboarding_date TIMESTAMPTZ NULL
);

-- =========================
-- 3) ASSETS (Ativos Pai)
-- =========================
CREATE TABLE IF NOT EXISTS assets (
  id BIGSERIAL PRIMARY KEY,
  asset_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Disponível',
  observacao TEXT,
  "EmployeeId" BIGINT NULL REFERENCES employees(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ix_assets_employee ON assets("EmployeeId");

-- =========================
-- 4) Detalhes por tipo (1:1)
-- =========================
CREATE TABLE IF NOT EXISTS asset_notebooks (
  id BIGSERIAL PRIMARY KEY,
  "AssetId" BIGINT NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  serial_number VARCHAR(100) UNIQUE,
  patrimonio VARCHAR(100) UNIQUE,
  modelo VARCHAR(100),
  garantia VARCHAR(100),
  status_garantia VARCHAR(50),
  data_aquisicao DATE NULL
);

CREATE TABLE IF NOT EXISTS asset_celulares (
  id BIGSERIAL PRIMARY KEY,
  "AssetId" BIGINT NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  imei VARCHAR(80) UNIQUE,
  modelo VARCHAR(100),
  grupo VARCHAR(100),
  responsavel VARCHAR(150),
  data_aquisicao DATE NULL
);

CREATE TABLE IF NOT EXISTS asset_chips (
  id BIGSERIAL PRIMARY KEY,
  "AssetId" BIGINT NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  numero VARCHAR(50) UNIQUE,
  iccid VARCHAR(60) UNIQUE,
  plano VARCHAR(100),
  grupo VARCHAR(100),
  responsavel VARCHAR(150),
  vencimento_plano DATE NULL,
  data_aquisicao DATE NULL
);

CREATE TABLE IF NOT EXISTS asset_starlinks (
  id BIGSERIAL PRIMARY KEY,
  "AssetId" BIGINT NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  modelo VARCHAR(100),
  grupo VARCHAR(100),
  localizacao VARCHAR(150),
  responsavel VARCHAR(150),
  email VARCHAR(150),
  senha VARCHAR(150),
  senha_roteador VARCHAR(150),
  projeto VARCHAR(150),
  email_responsavel VARCHAR(150),
  data_aquisicao DATE NULL
);

-- =========================
-- 5) Histórico de atribuições (N:M)
-- =========================
CREATE TABLE IF NOT EXISTS asset_assignments (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ NULL,
  pdf_term_url TEXT
);
CREATE INDEX IF NOT EXISTS ix_assign_employee ON asset_assignments(employee_id);
CREATE INDEX IF NOT EXISTS ix_assign_asset ON asset_assignments(asset_id);

-- =========================
-- 6) Licenças e vínculos
-- =========================
CREATE TABLE IF NOT EXISTS licenses (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  fornecedor VARCHAR(150),
  plano VARCHAR(150),
  custo NUMERIC(10,2),
  quantidade_total INTEGER DEFAULT 1,
  quantidade_em_uso INTEGER DEFAULT 0,
  data_renovacao DATE NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_licenses (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  license_id BIGINT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_emplic_pair UNIQUE (employee_id, license_id)
);
CREATE INDEX IF NOT EXISTS ix_emplic_employee ON employee_licenses(employee_id);
CREATE INDEX IF NOT EXISTS ix_emplic_license ON employee_licenses(license_id);

-- =========================
-- 7) Contratos (Medições)
-- =========================
CREATE TABLE IF NOT EXISTS contracts (
  id BIGSERIAL PRIMARY KEY,
  servico VARCHAR(150) NOT NULL,
  fornecedor VARCHAR(150) NOT NULL,
  mes_competencia VARCHAR(20) NOT NULL,
  valor_previsto DOUBLE PRECISION NULL,
  valor_realizado DOUBLE PRECISION NULL,
  url_contrato VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_contracts_serv_for_comp UNIQUE (servico, fornecedor, mes_competencia)
);
CREATE INDEX IF NOT EXISTS ix_contracts_competencia ON contracts(mes_competencia);

-- =========================
-- 8) Catálogo (valuation)
-- =========================
CREATE TABLE IF NOT EXISTS catalog_items (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  category VARCHAR(50),
  valor DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS ix_catalog_category ON catalog_items(category);

-- =========================
-- 9) Audit logs
-- =========================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(100),
  action VARCHAR(20) NOT NULL,
  record_id BIGINT NULL,
  old_data TEXT,
  new_data TEXT,
  changed_at TIMESTAMPTZ NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  "user" VARCHAR(150),
  module VARCHAR(100),
  details TEXT
);
CREATE INDEX IF NOT EXISTS ix_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS ix_audit_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS ix_audit_action ON audit_logs(action);
