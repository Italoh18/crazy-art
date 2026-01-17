-- SCRIPT DE MIGRAÇÃO - CRAZY ART D1
-- Execução: npx wrangler d1 execute crazyart-db --remote --file=./migrations.sql

-- Adiciona as colunas de endereço faltantes na tabela 'clients'
ALTER TABLE clients ADD COLUMN street TEXT;
ALTER TABLE clients ADD COLUMN number TEXT;
ALTER TABLE clients ADD COLUMN zipCode TEXT;

-- COMANDO DE VERIFICAÇÃO
-- Verifique se as colunas aparecem na saída deste comando
PRAGMA table_info(clients);

-- Teste de consistência (opcional)
SELECT id, name, street, number, zipCode FROM clients LIMIT 5;