import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../server/db.js';
import { seedWorld, STARTING_LOCATION_ID } from '../server/world/seed.js';
import { handleMovement } from '../server/handlers/movement.js';
import { handleDialogue } from '../server/handlers/dialogue.js';
import { handleWorldAction } from '../server/handlers/world-action.js';

const fakeGenerateLocation = async (direction, from) => ({
  name: `Deep Wood (${direction})`,
  description: 'Tall pines close in around you.',
  atmosphere: 'dense, quiet',
  connections: { north: null, south: null, east: null, west: null },
});

const fakeStreamAtmosphere = async (location, season, timeOfDay, onChunk) => {
  await onChunk(`You arrive at ${location.data.name}.`);
};

const fakeStreamDialogue = async (npc, input, events, season, tod, onChunk) => {
  await onChunk(`${npc.data.name} says: "Interesting..."`);
};

const fakeReasonConsequence = async () => ({
  narrative: 'The tree shudders.',
  changes: [{ type: 'event_log', description: 'Player carved a rune' }],
});

describe('movement handler', () => {
  let db;
  before(() => {
    db = createDb(':memory:');
    seedWorld(db);
    db.getOrCreatePlayer('tester', STARTING_LOCATION_ID);
  });
  after(() => db.close());

  test('moving to unknown direction creates a new location', async () => {
    const chunks = [];
    await handleMovement(db, 'tester', 'north', 'Spring', 'morning', {
      generateLocation: fakeGenerateLocation,
      streamAtmosphere: fakeStreamAtmosphere,
    }, chunk => chunks.push(chunk));

    const player = db.prepare('SELECT * FROM players WHERE username = ?').get('tester');
    assert.notEqual(player.location_id, STARTING_LOCATION_ID);
    assert.ok(chunks.join('').includes('Deep Wood'));
  });

  test('moving back south returns to starting location', async () => {
    const chunks = [];
    await handleMovement(db, 'tester', 'south', 'Spring', 'morning', {
      generateLocation: fakeGenerateLocation,
      streamAtmosphere: fakeStreamAtmosphere,
    }, chunk => chunks.push(chunk));

    const player = db.prepare('SELECT * FROM players WHERE username = ?').get('tester');
    assert.equal(player.location_id, STARTING_LOCATION_ID);
  });
});

describe('dialogue handler', () => {
  let db;
  before(() => {
    db = createDb(':memory:');
    seedWorld(db);
    db.getOrCreatePlayer('tester', STARTING_LOCATION_ID);
    db.upsert('npcs', 'npc_1', { name: 'Old Maren', personality: 'cryptic', memories: [] },
      { location_id: STARTING_LOCATION_ID });
  });
  after(() => db.close());

  test('dialogue with known NPC streams response', async () => {
    const chunks = [];
    await handleDialogue(db, 'tester', 'old maren', 'what do you know?', 'Spring', 'dusk', {
      streamDialogue: fakeStreamDialogue,
    }, chunk => chunks.push(chunk));

    assert.ok(chunks.join('').includes('Old Maren'));
  });

  test('dialogue with unknown target returns clarification', async () => {
    const chunks = [];
    await handleDialogue(db, 'tester', 'nobody here', 'hello?', 'Spring', 'dusk', {
      streamDialogue: fakeStreamDialogue,
    }, chunk => chunks.push(chunk));

    assert.ok(chunks.join('').toLowerCase().includes('no one'));
  });
});

describe('world-action handler', () => {
  let db;
  before(() => {
    db = createDb(':memory:');
    seedWorld(db);
    db.getOrCreatePlayer('tester', STARTING_LOCATION_ID);
  });
  after(() => db.close());

  test('world action logs event and streams narrative', async () => {
    const chunks = [];
    await handleWorldAction(db, 'tester', 'carve a rune into the bark', 'Spring', {
      reasonConsequence: fakeReasonConsequence,
    }, chunk => chunks.push(chunk));

    assert.ok(chunks.join('').includes('shudders'));
    const events = db.recentEvents(STARTING_LOCATION_ID, 10);
    assert.ok(events.some(e => e.data.description === 'Player carved a rune'));
  });
});
