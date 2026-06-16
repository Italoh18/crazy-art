-- ==========================================================
-- CRAZY ART - ADIÇÃO DA TABELA DE CUPONS DO CLIENTE (LOYALTY)
-- Execute este comando no console do Cloudflare D1
-- ==========================================================

CREATE TABLE IF NOT EXISTS client_coupons (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    coupon_id TEXT NOT NULL,
    code TEXT NOT NULL,
    percentage REAL NOT NULL,
    type TEXT NOT NULL, -- 'product', 'service', 'art', 'all'
    claimed_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    is_used INTEGER DEFAULT 0,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id)
);
