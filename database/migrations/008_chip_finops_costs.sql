-- Telecom/CHIP FinOps: custo unitário mensal e unidade de cobrança

ALTER TABLE asset_chips ADD COLUMN IF NOT EXISTS custo_unitario_mensal DOUBLE PRECISION NULL;
ALTER TABLE asset_chips ADD COLUMN IF NOT EXISTS unidade_cobranca VARCHAR(20) NULL;

