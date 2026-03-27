CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS npcs (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  location_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  location_id TEXT,
  holder_id TEXT,
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  location_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT,
  location_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  type TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  started_at TEXT DEFAULT (datetime('now'))
);
