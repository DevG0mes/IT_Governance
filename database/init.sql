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
-- 1.1) ACCESS PROFILES (Perfis)
-- =========================
CREATE TABLE IF NOT EXISTS access_profiles (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE,
  "permissionsJSON" TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_id BIGINT NULL REFERENCES access_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_users_profile_id ON users(profile_id);

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
  status_raw VARCHAR(80) NULL,
  status_source VARCHAR(30) NULL,
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
  data_aquisicao DATE NULL,
  valor_compra DOUBLE PRECISION NULL
);

CREATE TABLE IF NOT EXISTS asset_celulares (
  id BIGSERIAL PRIMARY KEY,
  "AssetId" BIGINT NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  imei VARCHAR(80) UNIQUE,
  modelo VARCHAR(100),
  grupo VARCHAR(100),
  responsavel VARCHAR(150),
  data_aquisicao DATE NULL,
  valor_compra DOUBLE PRECISION NULL
);

CREATE TABLE IF NOT EXISTS asset_chips (
  id BIGSERIAL PRIMARY KEY,
  "AssetId" BIGINT NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  numero VARCHAR(50) UNIQUE,
  iccid VARCHAR(60) UNIQUE,
  plano VARCHAR(100),
  grupo VARCHAR(100),
  responsavel VARCHAR(150),
  custo_unitario_mensal DOUBLE PRECISION NULL,
  unidade_cobranca VARCHAR(20) NULL,
  vencimento_plano DATE NULL,
  data_aquisicao DATE NULL,
  valor_compra DOUBLE PRECISION NULL
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
  data_aquisicao DATE NULL,
  valor_compra DOUBLE PRECISION NULL
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
-- 5.1) Logs de manutenção (histórico)
-- =========================
CREATE TABLE IF NOT EXISTS asset_maintenance_logs (
  id BIGSERIAL PRIMARY KEY,
  "AssetId" BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  chamado VARCHAR(80) NOT NULL,
  observacao TEXT NULL,
  custo_reparo DOUBLE PRECISION NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL,
  created_by VARCHAR(150) NULL
);

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
  details TEXT,
  valor_economizado DOUBLE PRECISION NULL
);
CREATE INDEX IF NOT EXISTS ix_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS ix_audit_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS ix_audit_action ON audit_logs(action);

-- =========================
-- 10) FinOps snapshots (regra de ouro)
-- =========================
CREATE TABLE IF NOT EXISTS finops_monthly_snapshots (
  id BIGSERIAL PRIMARY KEY,
  ym VARCHAR(7) NOT NULL UNIQUE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by VARCHAR(150) NULL,
  locked BOOLEAN NOT NULL DEFAULT true,
  data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_finops_snapshots_ym ON finops_monthly_snapshots(ym);
