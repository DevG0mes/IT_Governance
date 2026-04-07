-- Histórico de manutenção por ativo (Kanban + auditoria)
CREATE TABLE IF NOT EXISTS asset_maintenance_logs (
  id BIGSERIAL PRIMARY KEY,
  "AssetId" BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  chamado VARCHAR(80) NOT NULL,
  observacao TEXT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL,
  created_by VARCHAR(150) NULL
);

CREATE INDEX IF NOT EXISTS idx_asset_maintenance_logs_assetid ON asset_maintenance_logs ("AssetId");
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_logs_active ON asset_maintenance_logs ("AssetId") WHERE resolved_at IS NULL;

