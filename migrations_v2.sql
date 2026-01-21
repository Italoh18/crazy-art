CREATE TABLE IF NOT EXISTS catalog_v2 (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  cost_price REAL DEFAULT 0,
  image_url TEXT,
  description TEXT,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO catalog_v2 (
  id,
  type,
  name,
  price,
  cost_price,
  image_url,
  description,
  active,
  created_at
)
SELECT
  id,
  type,
  name,
  CAST(NULLIF(price, '') AS REAL),
  CAST(NULLIF(cost_price, '') AS REAL),
  image_url,
  description,
  CAST(NULLIF(active, '') AS INTEGER),
  created_at
FROM catalog;