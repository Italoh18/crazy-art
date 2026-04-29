-- Novas colunas para o Sistema de Aprovação de Pedidos
-- Execute estes comandos no seu console do Cloudflare D1

ALTER TABLE orders ADD COLUMN approval_image_url TEXT;
ALTER TABLE orders ADD COLUMN change_request_desc TEXT;
ALTER TABLE orders ADD COLUMN change_request_image_url TEXT;
ALTER TABLE orders ADD COLUMN approval_date TEXT;
