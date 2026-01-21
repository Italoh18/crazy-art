
-- SCRIPT DE ATUALIZAÇÃO DE SCHEMA - CRAZY ART D1
-- Execute: npx wrangler d1 execute crazyart-db --remote --file=./migrations.sql

-- 1. Clientes
ALTER TABLE clients ADD COLUMN street TEXT;
ALTER TABLE clients ADD COLUMN number TEXT;
ALTER TABLE clients ADD COLUMN zipCode TEXT;

-- 2. Catálogo (Produtos/Serviços unificados)
ALTER TABLE catalog ADD COLUMN cost_price REAL DEFAULT 0;

-- 3. Produtos (Tabela legada se ainda em uso)
ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0;

-- 4. Criação da Tabela de Itens de Pedido 
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    item_id TEXT,
    description TEXT,
    unit_price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    total REAL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 5. Soft Delete para Catálogo
ALTER TABLE catalog ADD COLUMN active INTEGER DEFAULT 1;
-- Garante que itens existentes sejam marcados como ativos
UPDATE catalog SET active = 1 WHERE active IS NULL;

-- 6. Coluna de Data de Pagamento
ALTER TABLE orders ADD COLUMN paid_at TEXT;

-- Verificação
PRAGMA table_info(catalog);
PRAGMA table_info(order_items);
PRAGMA table_info(orders);
