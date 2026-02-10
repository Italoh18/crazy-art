
-- SCRIPT DE ATUALIZAÇÃO DE SCHEMA - CRAZY ART D1

-- 1. Atualização da Tabela de Pedidos (Orders)
-- Execute estes comandos se encontrar erros de "no column named"
ALTER TABLE orders ADD COLUMN size_list TEXT;
ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'admin';
ALTER TABLE orders ADD COLUMN is_confirmed INTEGER DEFAULT 0;

-- 2. Atualização da Tabela de Clientes (Clients)
ALTER TABLE clients ADD COLUMN cloud_link TEXT;
-- ALTER TABLE clients ADD COLUMN street TEXT;
-- ALTER TABLE clients ADD COLUMN number TEXT;
-- ALTER TABLE clients ADD COLUMN zipCode TEXT;

-- 3. Criação da Tabela de Itens de Pedido (caso não exista)
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    catalog_id TEXT, -- Referência ao produto/serviço no catálogo
    name TEXT,
    type TEXT,
    unit_price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    total REAL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 4. Tabela para Lotes de Pagamento (Múltiplos pedidos em um link do MP)
CREATE TABLE IF NOT EXISTS payment_batches (
    id TEXT PRIMARY KEY,
    order_ids TEXT NOT NULL, 
    created_at TEXT NOT NULL
);

-- 5. Outras Tabelas de Suporte
CREATE TABLE IF NOT EXISTS email_templates (
    type TEXT PRIMARY KEY,
    subject TEXT,
    html_body TEXT,
    logo_url TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    target_role TEXT,
    user_id TEXT,
    type TEXT,
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT,
    reference_id TEXT
);
