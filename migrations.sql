
-- SCRIPT DE ATUALIZAÇÃO DE SCHEMA - CRAZY ART D1

-- 1. Clientes
-- ALTER TABLE clients ADD COLUMN street TEXT;
-- ALTER TABLE clients ADD COLUMN number TEXT;
-- ALTER TABLE clients ADD COLUMN zipCode TEXT;
-- ALTER TABLE clients ADD COLUMN cloud_link TEXT;

-- 2. Catálogo (Produtos/Serviços unificados)
-- ALTER TABLE catalog ADD COLUMN cost_price REAL DEFAULT 0;

-- 3. Produtos (Tabela legada se ainda em uso)
-- ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0;

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
-- ALTER TABLE catalog ADD COLUMN active INTEGER DEFAULT 1;

-- 6. Coluna de Data de Pagamento
-- ALTER TABLE orders ADD COLUMN paid_at TEXT;

-- 7. SISTEMA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    target_role TEXT, -- 'admin' ou 'client'
    user_id TEXT, -- ID do cliente específico (NULL se for para todos os admins)
    type TEXT, -- 'info', 'success', 'warning', 'error'
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT,
    reference_id TEXT -- ID do pedido relacionado
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(target_role);

-- 8. EMPRESAS QUE CONFIAM
CREATE TABLE IF NOT EXISTS trusted_companies (
    id TEXT PRIMARY KEY,
    name TEXT,
    image_url TEXT NOT NULL,
    created_at TEXT
);

-- 9. DRIVE DE ARTES
CREATE TABLE IF NOT EXISTS drive_files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    folder TEXT DEFAULT 'geral',
    url TEXT NOT NULL,
    type TEXT,
    size TEXT,
    created_at TEXT
);

-- 10. LOTES DE PAGAMENTO (Para permitir pagar muitas faturas de uma vez)
CREATE TABLE IF NOT EXISTS payment_batches (
    id TEXT PRIMARY KEY,
    order_ids TEXT NOT NULL, -- IDs separados por vírgula
    created_at TEXT NOT NULL
);
