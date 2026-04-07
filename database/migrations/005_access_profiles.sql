-- Perfis de acesso (templates) persistidos no banco
CREATE TABLE IF NOT EXISTS access_profiles (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE,
  "permissionsJSON" TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

