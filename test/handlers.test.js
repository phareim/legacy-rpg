import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../server/db.js';
import { seedWorld, STARTING_LOCATION_ID } from '../server/world/seed.js';
import { handleMovement } from '../server/handlers/movement.js';
import { handleDialogue } from '../server/handlers/dialogue.js';
import { handleTake, handleDrop, handleExamine, handleInventory } from '../server/handlers/items.js';
import { handleWorldAction } from '../server/handlers/world-action.js';

const CTX = { season: 'Spring', timeOfDay: 'morning', weather: 'mist' };

const fakeGenerateLocation = async (direction) => ({
  name: `Deep Wood (${direction})`,
  description: 'Tall pines close in around you.',
  atmosphere: 'dense, quiet',
  npc: direction === 'east' ? { name: 'The Charcoal Burner', personality: 'taciturn', mood: 'wary' } : null,
  item: direction === 'east' ? { name: 'a cold iron key', description: 'It hums faintly.' } : null,
});

const fakeStreamAtmosphere = async (location, ctx, onChunk) => {
  await onChunk(`You arrive at ${location.data.name}.`);
};

const fakeStreamDialogue = async (npc, input, events, rumors, ctx, onChunk) => {
  await onChunk(`${npc.data.name} says: "Interesting..." (rumors heard: ${rumors.length})`);
};

const fakeStreamItemDescription = async (item, location, ctx, onChunk) => {
  await onChunk(`You study ${item.data.name}.`);
};

function setup() {
  const db = createDb(':memory:');
  seedWorld(db);
  db.getOrCreatePlayer('tester', STARTING_LOCATION_ID);
  return db;
}

describe('movement handler', () => {
  let db;
  before(() => { db = setup(); });
  after(() => db.close());

  test('moving into unknown ground creates a new location', async () => {
    const chunks = [];
    await handleMovement(db, 'tester', 'north', CTX, {
      generateLocation: fakeGenerateLocation,
      streamAtmosphere: fakeStreamAtmosphere,
    }, c => chunks.push(c));

    const player = db.getPlayer('tester');
    assert.notEqual(player.location_id, STARTING_LOCATION_ID);
    assert.ok(chunks.join('').includes('Deep Wood'));
    assert.ok(player.data.visited.includes(player.location_id));
  });

  test('moving back south returns to starting location', async () => {
    await handleMovement(db, 'tester', 'south', CTX, {
      generateLocation: fakeGenerateLocation,
      streamAtmosphere: fakeStreamAtmosphere,
    }, () => {});
    assert.equal(db.getPlayer('tester').location_id, STARTING_LOCATION_ID);
  });

  test('generated locations can carry an inhabitant and an item', async () => {
    await handleMovement(db, 'tester', 'east', CTX, {
      generateLocation: fakeGenerateLocation,
      streamAtmosphere: fakeStreamAtmosphere,
    }, () => {});
    const loc = db.getPlayer('tester').location_id;
    assert.equal(db.npcsAt(loc).length, 1);
    assert.equal(db.npcsAt(loc)[0].data.name, 'The Charcoal Burner');
    assert.equal(db.itemsAt(loc)[0].data.name, 'a cold iron key');
  });

  test('arrival surfaces scars other players left behind', async () => {
    db.insertEvent('someone-else', STARTING_LOCATION_ID, 'world_action',
      { description: 'someone-else carved a spiral into the great oak' });

    const chunks = [];
    await handleMovement(db, 'tester', 'west', CTX, { // back to the start location
      generateLocation: fakeGenerateLocation,
      streamAtmosphere: fakeStreamAtmosphere,
    }, c => chunks.push(c));
    assert.equal(db.getPlayer('tester').location_id, STARTING_LOCATION_ID);
    assert.ok(chunks.join('').includes('carved a spiral'));
  });
});

describe('dialogue handler', () => {
  let db;
  before(() => { db = setup(); });
  after(() => db.close());

  test('seed world has someone to talk to', () => {
    assert.ok(db.npcsAt(STARTING_LOCATION_ID).length >= 1);
  });

  test('dialogue with known NPC streams response and stores memory', async () => {
    const chunks = [];
    await handleDialogue(db, 'tester', 'maren', 'what do you know?', CTX, {
      streamDialogue: fakeStreamDialogue,
    }, c => chunks.push(c));

    assert.ok(chunks.join('').includes('Old Maren'));
    const npc = db.getById('npcs', 'npc_maren');
    assert.ok(npc.data.memories[0].includes('what do you know?'));
  });

  test('untargeted dialogue with one NPC present talks to them', async () => {
    const chunks = [];
    await handleDialogue(db, 'tester', null, 'hello there', CTX, {
      streamDialogue: fakeStreamDialogue,
    }, c => chunks.push(c));
    assert.ok(chunks.join('').includes('Old Maren'));
  });

  test('dialogue with unknown target lists who is present', async () => {
    const chunks = [];
    await handleDialogue(db, 'tester', 'nobody here', 'hello?', CTX, {
      streamDialogue: fakeStreamDialogue,
    }, c => chunks.push(c));
    const out = chunks.join('');
    assert.ok(out.toLowerCase().includes('no one'));
    assert.ok(out.includes('Old Maren'));
  });
});

describe('item handlers', () => {
  let db;
  before(() => { db = setup(); });
  after(() => db.close());

  test('take moves an item from the ground into inventory and logs it', async () => {
    const chunks = [];
    const handled = await handleTake(db, 'tester', 'lantern', c => chunks.push(c));
    assert.equal(handled, true);
    assert.equal(db.inventory('tester').length, 1);
    assert.equal(db.itemsAt(STARTING_LOCATION_ID).length, 0);
    assert.ok(db.recentEvents(STARTING_LOCATION_ID, 5).some(e => e.type === 'item_taken'));
  });

  test('inventory lists carried items', async () => {
    const chunks = [];
    await handleInventory(db, 'tester', c => chunks.push(c));
    assert.ok(chunks.join('').includes('lantern'));
  });

  test('examine streams a description for a carried item', async () => {
    const chunks = [];
    const handled = await handleExamine(db, 'tester', 'lantern', CTX, {
      streamItemDescription: fakeStreamItemDescription,
    }, c => chunks.push(c));
    assert.equal(handled, true);
    assert.ok(chunks.join('').includes('lantern'));
  });

  test('take of something not present is not handled (falls to world engine)', async () => {
    const handled = await handleTake(db, 'tester', 'the moon', () => {});
    assert.equal(handled, false);
  });

  test('drop returns the item to the ground for others to find', async () => {
    await handleDrop(db, 'tester', 'lantern', () => {});
    assert.equal(db.inventory('tester').length, 0);
    assert.equal(db.itemsAt(STARTING_LOCATION_ID).length, 1);
  });
});

describe('world-action handler', () => {
  let db;
  before(() => { db = setup(); });
  after(() => db.close());

  test('applies sanctioned changes and logs to the chronicle', async () => {
    const fakeReason = async () => ({
      narrative: 'The tree shudders.',
      changes: [
        { type: 'npc_create', data: { name: 'A Woken Dryad', personality: 'groggy', mood: 'annoyed' } },
        { type: 'item_create', data: { name: 'a sliver of living bark' }, holder: 'player' },
        { type: 'event_log', description: 'tester carved a rune into the great oak' },
      ],
    });

    const chunks = [];
    await handleWorldAction(db, 'tester', 'carve a rune into the bark', CTX,
      { reasonConsequence: fakeReason }, c => chunks.push(c));

    assert.ok(chunks.join('').includes('shudders'));
    assert.ok(db.npcsAt(STARTING_LOCATION_ID).some(n => n.data.name === 'A Woken Dryad'));
    assert.ok(db.inventory('tester').some(i => i.data.name === 'a sliver of living bark'));
    assert.ok(db.recentEvents(STARTING_LOCATION_ID, 10)
      .some(e => e.data.description?.includes('carved a rune')));
  });

  test('ignores changes that reach outside the player location', async () => {
    db.upsert('locations', 'loc_far', { name: 'Far Glade', connections: {} });
    db.upsert('items', 'item_far', { name: 'a far-off gem' }, { location_id: 'loc_far', holder_id: null });

    const fakeReason = async () => ({
      narrative: 'You reach across the world...',
      changes: [
        { type: 'item_move', id: 'item_far', to: 'player' },
        { type: 'location_patch', id: 'loc_far', patch: { description: 'ruined' } },
        { type: 'event_log', description: 'tester reached too far' },
      ],
    });

    await handleWorldAction(db, 'tester', 'steal the far gem', CTX,
      { reasonConsequence: fakeReason }, () => {});

    assert.equal(db.getById('items', 'item_far').location_id, 'loc_far');
    assert.equal(db.getById('locations', 'loc_far').data.description, undefined);
  });

  test('always leaves a chronicle entry even when the model forgets', async () => {
    const fakeReason = async () => ({ narrative: 'Nothing much.', changes: [] });
    const beforeCount = db.recentEvents(STARTING_LOCATION_ID, 50).length;
    await handleWorldAction(db, 'tester', 'whistle a tune', CTX,
      { reasonConsequence: fakeReason }, () => {});
    assert.equal(db.recentEvents(STARTING_LOCATION_ID, 50).length, beforeCount + 1);
  });
});
