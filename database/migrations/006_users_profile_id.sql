-- Vínculo opcional: usuário do sistema → perfil de acesso (access_profiles)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_id BIGINT NULL REFERENCES access_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_users_profile_id ON users(profile_id);
