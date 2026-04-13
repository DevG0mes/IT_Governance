-- Usuários: obrigar troca de senha no primeiro acesso
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NULL;

-- CHIPs: previsão de cancelamento (para automação do status)
ALTER TABLE asset_chips ADD COLUMN IF NOT EXISTS previsao_cancelamento DATE NULL;

