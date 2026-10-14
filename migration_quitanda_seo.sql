-- ==========================================================
-- CRAZY ART - MIGRAÇÃO SEO E SLUGS DA QUITANDA DE ARTES (CLOUDFLARE D1)
-- Execute estes comandos no Cloudflare D1 Console (ou via Wrangler)
-- ==========================================================

-- 1. Adicionar coluna slug para URL amigável/legível
ALTER TABLE catalog ADD COLUMN slug TEXT;

-- 2. Adicionar coluna alt_text para SEO descritivo de imagem
ALTER TABLE catalog ADD COLUMN alt_text TEXT;

-- 3. Criar índices para alta performance de consulta no Cloudflare Pages
CREATE INDEX IF NOT EXISTS idx_catalog_slug ON catalog(slug);
CREATE INDEX IF NOT EXISTS idx_catalog_type_slug ON catalog(type, slug);
