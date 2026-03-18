-- Slim game state (large blobs in R2)
CREATE TABLE IF NOT EXISTS game_states (
  user_id TEXT PRIMARY KEY,
  coordinates_north INTEGER DEFAULT 0,
  coordinates_west INTEGER DEFAULT 0,
  current_place_name TEXT,
  current_place_description TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- World locations
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,              -- "north,west"
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  coordinates_north INTEGER NOT NULL,
  coordinates_west INTEGER NOT NULL,
  modifications TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Items in the world
CREATE TABLE IF NOT EXISTS items (
  name TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  properties TEXT DEFAULT '{}',
  location_north INTEGER,
  location_west INTEGER,
  is_picked_up INTEGER DEFAULT 0,
  is_legacy INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Characters: core fields only (conversation/quest blobs in R2)
CREATE TABLE IF NOT EXISTS characters (
  name TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  personality TEXT,
  location_north INTEGER,
  location_west INTEGER,
  has_left INTEGER DEFAULT 0,
  relationship_level INTEGER DEFAULT 0,
  mood TEXT DEFAULT 'neutral',
  times_spoken_to INTEGER DEFAULT 0,
  first_met_at DATETIME,
  last_interaction_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
