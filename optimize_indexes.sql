-- Índices para Notificações (Reduz leitura em massa ao carregar o sino)
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Índices para Pedidos (Otimiza filtros de busca e painel admin)
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Índices para Assinaturas Push
CREATE INDEX IF NOT EXISTS idx_push_user_id ON push_subscriptions(user_id);

-- Índices para Catálogo
CREATE INDEX IF NOT EXISTS idx_catalog_active ON catalog(active);
CREATE INDEX IF NOT EXISTS idx_catalog_type ON catalog(type);
