import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../server/db.js';
import { initSeason, getCurrentSeason, getTimeOfDay } from '../server/world/season.js';

describe('season', () => {
  let db;

  before(() => {
    db = createDb(':memory:');
  });

  after(() => {
    db.close();
  });

  test('initSeason inserts Spring when no season exists', () => {
    initSeason(db);
    const season = db.getSeason();
    assert.equal(season.name, 'Spring');
  });

  test('initSeason does not overwrite existing season', () => {
    db.insertSeason('Winter');
    initSeason(db);
    const season = db.getSeason();
    assert.equal(season.name, 'Winter');
  });

  test('getCurrentSeason returns season name from db', () => {
    const name = getCurrentSeason(db);
    assert.ok(['Spring', 'Summer', 'Autumn', 'Winter'].includes(name));
  });

  test('getTimeOfDay returns a valid time of day string', () => {
    const tod = getTimeOfDay();
    assert.ok(['dawn', 'morning', 'afternoon', 'dusk', 'night'].includes(tod));
  });
});
