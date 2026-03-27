import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../server/db.js';

describe('db', () => {
  let db;

  before(() => {
    db = createDb(':memory:');
  });

  after(() => {
    db.close();
  });

  test('upsert and getById round-trip', () => {
    db.upsert('locations', 'loc_1', { name: 'The Hollow', atmosphere: 'eerie' });
    const result = db.getById('locations', 'loc_1');
    assert.equal(result.data.name, 'The Hollow');
    assert.equal(result.data.atmosphere, 'eerie');
  });

  test('upsert with extra fields', () => {
    db.upsert('items', 'item_1', { name: 'Glowing Stone' }, { location_id: 'loc_1' });
    const result = db.getById('items', 'item_1');
    assert.equal(result.location_id, 'loc_1');
    assert.equal(result.data.name, 'Glowing Stone');
  });

  test('insertEvent and recentEvents', () => {
    db.insertEvent('player_1', 'loc_1', 'movement', { direction: 'north' });
    const events = db.recentEvents('loc_1', 10);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'movement');
    assert.equal(events[0].data.direction, 'north');
  });

  test('getOrCreatePlayer creates new player at starting location', () => {
    const player = db.getOrCreatePlayer('wanderer', 'loc_start');
    assert.equal(player.username, 'wanderer');
    assert.equal(player.location_id, 'loc_start');
  });

  test('getOrCreatePlayer returns existing player unchanged', () => {
    db.getOrCreatePlayer('wanderer', 'loc_start');
    db.upsert('players', 'wanderer', { visited: ['loc_start'] }, { location_id: 'loc_1' });
    const player = db.getOrCreatePlayer('wanderer', 'loc_start');
    assert.equal(player.location_id, 'loc_1'); // not reset to start
  });

  test('getSeason returns null when no season exists', () => {
    const season = db.getSeason();
    assert.equal(season, null);
  });

  test('insertSeason and getSeason', () => {
    db.insertSeason('Spring');
    const season = db.getSeason();
    assert.equal(season.name, 'Spring');
  });
});
