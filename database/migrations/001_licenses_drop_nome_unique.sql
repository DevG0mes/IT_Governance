-- Permite o mesmo nome de software em linhas distintas (ex.: Mensal vs Anual ou custos diferentes).
-- Execute uma vez no PostgreSQL se a tabela já existir com UNIQUE em nome.

ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_nome_key;

ALTER TABLE licenses ALTER COLUMN nome TYPE VARCHAR(255);
