import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../server/db.js';
import { initSeason, getCurrentSeason, getTimeOfDay, getWeather } from '../server/world/season.js';

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
    assert.equal(db.getSeason().name, 'Spring');
  });

  test('initSeason does not overwrite existing season', () => {
    db.insertSeason('Winter');
    initSeason(db);
    assert.equal(db.getSeason().name, 'Winter');
  });

  test('getCurrentSeason returns the stored season when within duration', () => {
    db.insertSeason('Autumn');
    assert.equal(getCurrentSeason(db), 'Autumn');
  });

  test('getCurrentSeason advances lazily when the duration has elapsed', () => {
    // Started 10 days ago with a 168h (7-day) season → should now be the next one.
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000)
      .toISOString().slice(0, 19).replace('T', ' ');
    db.insertSeason('Spring', tenDaysAgo);
    assert.equal(getCurrentSeason(db), 'Summer');
    // And it persisted, with a started_at 7 days after the old one.
    assert.equal(db.getSeason().name, 'Summer');
  });

  test('getCurrentSeason catches up across multiple elapsed seasons', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000)
      .toISOString().slice(0, 19).replace('T', ' ');
    db.insertSeason('Spring', thirtyDaysAgo);
    // 30 days / 7-day seasons = 4 full seasons elapsed → back to Spring.
    assert.equal(getCurrentSeason(db), 'Spring');
  });

  test('getCurrentSeason survives a restart without resetting the clock', () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000)
      .toISOString().slice(0, 19).replace('T', ' ');
    db.insertSeason('Summer', sixDaysAgo);
    getCurrentSeason(db); // simulated restart read
    assert.equal(db.getSeason().name, 'Summer');
    assert.equal(db.getSeason().started_at, sixDaysAgo); // clock untouched
  });

  test('getTimeOfDay returns a valid time of day string', () => {
    assert.ok(['dawn', 'morning', 'afternoon', 'dusk', 'night'].includes(getTimeOfDay()));
  });

  test('getWeather is deterministic per day and season', () => {
    const date = new Date('2026-06-12T10:00:00Z');
    assert.equal(getWeather('Winter', date), getWeather('Winter', date));
    assert.equal(typeof getWeather('Summer', date), 'string');
  });
});
