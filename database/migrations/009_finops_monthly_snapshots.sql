-- FinOps monthly snapshots: imutabilidade do histórico financeiro

CREATE TABLE IF NOT EXISTS finops_monthly_snapshots (
  id BIGSERIAL PRIMARY KEY,
  ym VARCHAR(7) NOT NULL UNIQUE, -- YYYY-MM
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by VARCHAR(150) NULL,
  locked BOOLEAN NOT NULL DEFAULT true,
  data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_finops_snapshots_ym ON finops_monthly_snapshots(ym);

