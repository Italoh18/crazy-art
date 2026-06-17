-- ==========================================================
-- CRAZY ART - MIGRATION PARA ARTES ADQUIRIDAS (CONTA CLIENTE)
-- Execute este comando no console do Cloudflare D1 do seu projeto
-- ==========================================================

CREATE TABLE IF NOT EXISTS client_purchased_arts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    art_id TEXT NOT NULL,
    art_name TEXT NOT NULL,
    download_link TEXT,
    purchased_at TEXT NOT NULL
);

-- Indexação para aprimorar performance de consulta
CREATE INDEX IF NOT EXISTS idx_client_purchased_arts_client ON client_purchased_arts(client_id);
