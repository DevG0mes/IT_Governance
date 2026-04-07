-- Preservar status "cru" do Excel/UI para auditoria e relatórios
ALTER TABLE assets ADD COLUMN IF NOT EXISTS status_raw VARCHAR(80) NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS status_source VARCHAR(30) NULL;

