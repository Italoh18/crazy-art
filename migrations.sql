
-- ==========================================================
-- CRAZY ART - SCHEMA COMPLETO PARA CLOUDFLARE D1
-- Execute estes comandos no console do Cloudflare D1
-- ==========================================================

-- 1. Tabela de Configurações do Site (Favicon, Logo, etc)
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT
);

-- 2. Tabela de Clientes
-- Atualizado: Auth com Senha
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cpf TEXT UNIQUE,
    street TEXT,
    number TEXT,
    zipCode TEXT,
    creditLimit REAL DEFAULT 0,
    cloud_link TEXT,
    password_hash TEXT,
    created_at TEXT NOT NULL
);

-- 3. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number INTEGER,
    client_id TEXT NOT NULL,
    description TEXT,
    order_date TEXT,
    due_date TEXT,
    total REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    status TEXT DEFAULT 'open',
    source TEXT DEFAULT 'admin',
    size_list TEXT,
    is_confirmed INTEGER DEFAULT 0,
    paid_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- 4. Tabela de Itens de Pedido
-- Atualizado: download_link para artes digitais
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    catalog_id TEXT,
    name TEXT,
    type TEXT,
    unit_price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    total REAL DEFAULT 0,
    download_link TEXT, 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 5. Tabela de Catálogo (Produtos, Serviços e Artes)
-- Atualizado: download_link para artes digitais
CREATE TABLE IF NOT EXISTS catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT DEFAULT 'product', -- 'product', 'service', 'art'
    name TEXT NOT NULL,
    price REAL NOT NULL,
    cost REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    image_url TEXT,
    download_link TEXT,
    description TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de Cupons de Desconto
CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    percentage REAL NOT NULL,
    type TEXT NOT NULL, -- 'product', 'service', 'art', 'all'
    created_at TEXT NOT NULL
);

-- 7. Outras tabelas de suporte (Imagens, Drive, Notificações)
CREATE TABLE IF NOT EXISTS carousel (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trusted_companies (
    id TEXT PRIMARY KEY,
    name TEXT,
    image_url TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drive_files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    folder TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT,
    size TEXT,
    created_at TEXT NOT NULL
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

CREATE TABLE IF NOT EXISTS payment_batches (
    id TEXT PRIMARY KEY,
    order_ids TEXT NOT NULL, 
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_templates (
    type TEXT PRIMARY KEY,
    subject TEXT,
    html_body TEXT,
    logo_url TEXT,
    updated_at TEXT
);

-- 8. Tabela de Feedbacks (Assistente Virtual)
CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'erro', 'sugestao', 'reclamacao', 'agradecimento'
    content TEXT NOT NULL,
    user_name TEXT,
    created_at TEXT NOT NULL,
    is_read INTEGER DEFAULT 0
);

-- 9. Tabela de Avaliações (Rating CSAT)
CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    user_name TEXT,
    rating INTEGER NOT NULL,
    created_at TEXT NOT NULL
);
