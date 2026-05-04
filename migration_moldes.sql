CREATE TABLE IF NOT EXISTS moldes (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  image_url TEXT,
  measurements TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
