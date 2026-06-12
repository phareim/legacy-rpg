import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ALLOWED_TABLES = new Set(['locations', 'npcs', 'items', 'players', 'events', 'seasons']);

function parseRow(row) {
  return row ? { ...row, data: JSON.parse(row.data) } : null;
}

export function createDb(path) {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = readFileSync(join(__dirname, '../database/schema.sql'), 'utf8');
  db.exec(schema);

  db.getById = function (table, id) {
    if (!ALLOWED_TABLES.has(table)) throw new Error(`Invalid table: ${table}`);
    return parseRow(this.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
  };

  db.upsert = function (table, id, data, extraFields = {}) {
    if (!ALLOWED_TABLES.has(table)) throw new Error(`Invalid table: ${table}`);
    const extras = Object.keys(extraFields);
    const cols = ['id', 'data', ...extras].join(', ');
    const placeholders = ['?', '?', ...extras.map(() => '?')].join(', ');
    const updates = ['data = excluded.data', ...extras.map(k => `${k} = excluded.${k}`)].join(', ');
    this.prepare(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updates}`
    ).run(id, JSON.stringify(data), ...extras.map(k => extraFields[k]));
  };

  db.deleteById = function (table, id) {
    if (!ALLOWED_TABLES.has(table)) throw new Error(`Invalid table: ${table}`);
    this.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  };

  db.npcsAt = function (locationId) {
    return this.prepare(`SELECT * FROM npcs WHERE location_id = ?`).all(locationId).map(parseRow);
  };

  db.itemsAt = function (locationId) {
    return this.prepare(`SELECT * FROM items WHERE location_id = ? AND holder_id IS NULL`)
      .all(locationId).map(parseRow);
  };

  db.inventory = function (playerId) {
    return this.prepare(`SELECT * FROM items WHERE holder_id = ?`).all(playerId).map(parseRow);
  };

  // Fuzzy name match over parsed rows: exact > startsWith > includes (both
  // directions); if the full phrase misses, retry word by word so
  // "maren about the lantern" still finds Old Maren.
  db.findByName = function (rows, rawName) {
    if (!rawName) return null;
    const named = rows.filter(r => r.data?.name);
    const match = (name) =>
      named.find(r => r.data.name.toLowerCase() === name) ??
      named.find(r => r.data.name.toLowerCase().startsWith(name)) ??
      named.find(r => r.data.name.toLowerCase().includes(name)) ??
      named.find(r => name.includes(r.data.name.toLowerCase())) ??
      null;

    const name = rawName.toLowerCase().replace(/^(the|a|an|my)\s+/, '').trim();
    if (!name) return null;
    const whole = match(name);
    if (whole) return whole;
    for (const word of name.split(/\s+/)) {
      if (word.length < 3) continue;
      const hit = match(word);
      if (hit) return hit;
    }
    return null;
  };

  db.insertEvent = function (playerId, locationId, type, data) {
    this.prepare(
      `INSERT INTO events (player_id, location_id, type, data) VALUES (?, ?, ?, ?)`
    ).run(playerId, locationId, type, JSON.stringify(data));
  };

  db.recentEvents = function (locationId, limit = 20) {
    return this.prepare(
      `SELECT * FROM events WHERE location_id = ? ORDER BY id DESC LIMIT ?`
    ).all(locationId, limit).map(parseRow);
  };

  // Recent notable events anywhere EXCEPT here — the rumor mill NPCs draw on.
  db.recentRumors = function (excludeLocationId, limit = 5) {
    return this.prepare(
      `SELECT e.*, l.data AS location_data FROM events e
       LEFT JOIN locations l ON l.id = e.location_id
       WHERE e.location_id != ? AND e.type IN ('world_action', 'item_taken')
       ORDER BY e.id DESC LIMIT ?`
    ).all(excludeLocationId, limit).map(row => ({
      ...row,
      data: JSON.parse(row.data),
      location_name: row.location_data ? JSON.parse(row.location_data).name : 'somewhere in the wood',
    }));
  };

  db.chronicle = function (limit = 30) {
    return this.prepare(
      `SELECT e.*, l.data AS location_data FROM events e
       LEFT JOIN locations l ON l.id = e.location_id
       ORDER BY e.id DESC LIMIT ?`
    ).all(limit).map(row => ({
      ...row,
      data: JSON.parse(row.data),
      location_name: row.location_data ? JSON.parse(row.location_data).name : 'the deep wood',
    }));
  };

  db.allLocations = function () {
    return this.prepare(`SELECT * FROM locations`).all().map(parseRow);
  };

  db.getPlayer = function (username) {
    return parseRow(this.prepare(`SELECT * FROM players WHERE username = ?`).get(username));
  };

  db.getOrCreatePlayer = function (username, startLocationId) {
    const existing = this.getPlayer(username);
    if (existing) return existing;
    const data = { visited: [startLocationId] };
    this.prepare(
      `INSERT INTO players (id, username, location_id, data) VALUES (?, ?, ?, ?)`
    ).run(username, username, startLocationId, JSON.stringify(data));
    return { id: username, username, location_id: startLocationId, data };
  };

  db.updatePlayer = function (username, locationId, data) {
    this.prepare(`UPDATE players SET location_id = ?, data = ? WHERE username = ?`)
      .run(locationId, JSON.stringify(data), username);
  };

  db.getSeason = function () {
    return this.prepare(`SELECT * FROM seasons ORDER BY id DESC LIMIT 1`).get() ?? null;
  };

  db.insertSeason = function (name, startedAt = null) {
    if (startedAt) {
      this.prepare(`INSERT INTO seasons (name, started_at) VALUES (?, ?)`).run(name, startedAt);
    } else {
      this.prepare(`INSERT INTO seasons (name) VALUES (?)`).run(name);
    }
    this.prepare(`DELETE FROM seasons WHERE id < (SELECT MAX(id) FROM seasons)`).run();
  };

  return db;
}
