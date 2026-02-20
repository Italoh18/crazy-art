# Contexto do Projeto Crazy Art

## Infraestrutura e Deploy
- **Repositório:** GitHub
- **Deploy Automático:** Cloudflare Pages (conectado ao GitHub)
- **Framework:** React (Vite)
- **Linguagem:** TypeScript
- **Backend:** Cloudflare Workers (Functions) ou API externa configurada via `VITE_API_BASE_URL`
- **Banco de Dados:** D1 (SQLite) no Cloudflare (provavelmente, dado o `wrangler.toml` e `migrations.sql`)

## Banco de Dados (Cloudflare D1)
**Tabela `clients` Atual:**
```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT UNIQUE NOT NULL,
  street TEXT,
  number TEXT,
  zipCode TEXT,
  creditLimit REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cloud_link TEXT,
  password_hash TEXT,        -- Nova coluna
  verification_code TEXT,    -- Nova coluna
  is_verified INTEGER DEFAULT 0, -- Nova coluna
  is_subscriber INTEGER DEFAULT 0
);
```

## Serviços Externos
- **Emails:** Resend
- **Pagamentos:** Mercado Pago
- **Domínio:** crazyart.com.br

## Estrutura de Pastas Importante
- `/public`: Arquivos estáticos que devem ser servidos na raiz (ex: `sw.js`, `manifest.json`, `_redirects`).
- `/functions`: Cloudflare Pages Functions (backend serverless).
- `/src`: Código fonte React.

## Notas de Manutenção
- **Service Worker:** O arquivo `sw.js` deve residir em `/public` para ser copiado corretamente para a raiz do build (`dist/`) pelo Vite.
- **Roteamento:** O arquivo `public/_redirects` é essencial para o roteamento SPA no Cloudflare Pages (redirecionar tudo para `index.html`).
- **Ícones:** Sempre verifique se os ícones usados (lucide-react) estão importados corretamente.

## Comandos Úteis
- `npm run dev`: Inicia servidor de desenvolvimento local.
- `npm run build`: Gera o build de produção em `dist/`.
- `npm run preview`: Visualiza o build localmente.
