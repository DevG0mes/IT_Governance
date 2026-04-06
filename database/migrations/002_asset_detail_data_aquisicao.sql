-- Data de aquisição por unidade (mesmo modelo, datas diferentes → depreciação por ativo)
ALTER TABLE asset_notebooks ADD COLUMN IF NOT EXISTS data_aquisicao DATE NULL;
ALTER TABLE asset_celulares ADD COLUMN IF NOT EXISTS data_aquisicao DATE NULL;
ALTER TABLE asset_chips ADD COLUMN IF NOT EXISTS data_aquisicao DATE NULL;
ALTER TABLE asset_starlinks ADD COLUMN IF NOT EXISTS data_aquisicao DATE NULL;
