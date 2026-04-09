-- FinOps upgrades: valor_compra (residual), custo_reparo (TCO), valor_economizado (Savings)

-- 1) Valor de compra por ativo (detalhes 1:1)
ALTER TABLE asset_notebooks ADD COLUMN IF NOT EXISTS valor_compra DOUBLE PRECISION NULL;
ALTER TABLE asset_celulares ADD COLUMN IF NOT EXISTS valor_compra DOUBLE PRECISION NULL;
ALTER TABLE asset_chips ADD COLUMN IF NOT EXISTS valor_compra DOUBLE PRECISION NULL;
ALTER TABLE asset_starlinks ADD COLUMN IF NOT EXISTS valor_compra DOUBLE PRECISION NULL;

-- 2) TCO: custo do reparo por ticket/log de manutenção
ALTER TABLE asset_maintenance_logs ADD COLUMN IF NOT EXISTS custo_reparo DOUBLE PRECISION NULL;

-- 3) Savings: valor economizado em ações (ex.: revogação de licença)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS valor_economizado DOUBLE PRECISION NULL;

