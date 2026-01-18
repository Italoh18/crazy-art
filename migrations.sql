
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

-- 4. Criação da Tabela de Itens de Pedido (Necessária para a nova lógica de pedidos)
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    item_type TEXT DEFAULT 'product',
    item_id TEXT,
    description TEXT,
    unit_price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    total REAL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Verificação
PRAGMA table_info(catalog);
PRAGMA table_info(order_items);
