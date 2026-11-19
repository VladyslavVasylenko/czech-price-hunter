CREATE TABLE IF NOT EXISTS flyers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store TEXT NOT NULL,
  region TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT NOT NULL,
  source_url TEXT,
  collected_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flyer_id INTEGER NOT NULL REFERENCES flyers(id) ON DELETE CASCADE,
  store TEXT NOT NULL,
  region TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  brand TEXT,
  price REAL NOT NULL CHECK(price >= 0),
  old_price REAL,
  unit TEXT,
  valid_from TEXT NOT NULL,
  valid_to TEXT NOT NULL,
  loyalty_required INTEGER NOT NULL DEFAULT 0,
  source_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_offers_search ON offers(normalized_name, store, region);
CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(valid_from, valid_to);
CREATE TABLE IF NOT EXISTS collection_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL,
  details TEXT
);
