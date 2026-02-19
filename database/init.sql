-- Criação das Tabelas Base
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Support',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    job_title VARCHAR(100),
    department VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    asset_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Disponível',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabelas de Especialização
CREATE TABLE asset_notebooks (
    asset_id INTEGER PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) UNIQUE,
    service_tag VARCHAR(50) UNIQUE,
    model VARCHAR(100),
    purchase_date DATE,
    warranty_expiration DATE
);

-- Tabela de Atribuições (Relacionamento N:M)
CREATE TABLE asset_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    asset_id INTEGER REFERENCES assets(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    returned_at TIMESTAMP,
    pdf_term_url TEXT
);

-- Tabela FinOps M365
CREATE TABLE m365_licenses (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    license_type VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    monthly_cost DECIMAL(10, 2),
    assigned_date DATE
);