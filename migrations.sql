-- SCRIPT DE CORREÇÃO DE SCHEMA - CRAZY ART D1
-- IMPORTANTE: Este comando deve ser executado via terminal para o banco de PRODUÇÃO.
-- Comando sugerido: npx wrangler d1 execute crazyart-db --remote --file=./migrations.sql

-- Adiciona as colunas de endereço à tabela existente
ALTER TABLE clients ADD COLUMN street TEXT;
ALTER TABLE clients ADD COLUMN number TEXT;
ALTER TABLE clients ADD COLUMN zipCode TEXT;

-- Comando para verificar se as colunas foram aplicadas com sucesso
-- A saída deve listar street, number e zipCode
PRAGMA table_info(clients);