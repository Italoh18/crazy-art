-- Coluna para arquivo de arte final enviado ao cliente quando o pedido é concluído
ALTER TABLE orders ADD COLUMN completed_art_url TEXT;
