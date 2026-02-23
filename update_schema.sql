-- Adicionar colunas para controle de pagamento e finalização
-- Execute estas linhas no console D1 da Cloudflare ou via wrangler d1 execute

-- 1. Adicionar coluna payment_method (se não existir)
ALTER TABLE orders ADD COLUMN payment_method TEXT;

-- 2. Adicionar coluna finished_by_admin (se não existir)
ALTER TABLE orders ADD COLUMN finished_by_admin INTEGER DEFAULT 0;

-- 3. Adicionar coluna finished_at (se não existir)
ALTER TABLE orders ADD COLUMN finished_at TEXT;

-- 4. Adicionar coluna paid_at (se não existir)
ALTER TABLE orders ADD COLUMN paid_at TEXT;
