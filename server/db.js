import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createDb(path) {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = readFileSync(join(__dirname, '../database/schema.sql'), 'utf8');
  db.exec(schema);

  db.getById = function (table, id) {
    const row = this.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) return null;
    return { ...row, data: JSON.parse(row.data) };
  };

  db.upsert = function (table, id, data, extraFields = {}) {
    const extras = Object.keys(extraFields);
    const cols = ['id', 'data', ...extras].join(', ');
    const placeholders = ['?', '?', ...extras.map(() => '?')].join(', ');
    const updates = ['data = excluded.data', ...extras.map(k => `${k} = excluded.${k}`)].join(', ');
    this.prepare(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updates}`
    ).run(id, JSON.stringify(data), ...extras.map(k => extraFields[k]));
  };

  db.insertEvent = function (playerId, locationId, type, data) {
    this.prepare(
      `INSERT INTO events (player_id, location_id, type, data) VALUES (?, ?, ?, ?)`
    ).run(playerId, locationId, type, JSON.stringify(data));
  };

  db.recentEvents = function (locationId, limit = 20) {
    return this.prepare(
      `SELECT * FROM events WHERE location_id = ? ORDER BY created_at DESC LIMIT ?`
    ).all(locationId, limit).map(row => ({ ...row, data: JSON.parse(row.data) }));
  };

  db.getOrCreatePlayer = function (username, startLocationId) {
    const existing = this.prepare(`SELECT * FROM players WHERE username = ?`).get(username);
    if (existing) return { ...existing, data: JSON.parse(existing.data) };
    this.prepare(
      `INSERT INTO players (id, username, location_id, data) VALUES (?, ?, ?, ?)`
    ).run(username, username, startLocationId, '{}');
    return { id: username, username, location_id: startLocationId, data: {} };
  };

  db.getSeason = function () {
    return this.prepare(`SELECT * FROM seasons ORDER BY id DESC LIMIT 1`).get() ?? null;
  };

  db.insertSeason = function (name) {
    this.prepare(`INSERT INTO seasons (name) VALUES (?)`).run(name);
  };

  return db;
}
