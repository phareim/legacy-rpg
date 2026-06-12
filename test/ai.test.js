import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseIntentFromText } from '../server/ai/intent.js';
import { buildNpcPrompt, buildLocationPrompt } from '../server/ai/dialogue.js';
import { buildConsequencePrompt, sanitizeConsequence } from '../server/ai/consequence.js';

const CTX = { season: 'Autumn', timeOfDay: 'dusk', weather: 'cold low fog' };

describe('intent parsing (fallback parser)', () => {
  const cases = [
    ['go north', 'movement', 'north'],
    ['north', 'movement', 'north'],
    ['walk back', 'movement', 'back'],
    ['talk to the old woman', 'dialogue', 'old woman'],
    ['talk to the spirit of the north wind', 'dialogue', 'spirit of the north wind'],
    ['pick up the glowing stone', 'take', 'glowing stone'],
    ['take lantern', 'take', 'lantern'],
    ['drop the lantern', 'drop', 'lantern'],
    ['examine the runes', 'examine', 'runes'],
    ['look at the lantern', 'examine', 'lantern'],
    ['look', 'look', null],
    ['look around', 'look', null],
    ['inventory', 'inventory', null],
    ['help', 'help', null],
    ['burn the ancient tree', 'world_action', null],
    ['sing to the moon', 'world_action', null],
    ['I made a mistake', 'world_action', null], // "take" must not match inside "mistake"
    ['...', 'ambiguous', null],
  ];

  for (const [input, intent, target] of cases) {
    test(`"${input}" → ${intent}${target ? ` (${target})` : ''}`, () => {
      const result = parseIntentFromText(input);
      assert.equal(result.intent, intent);
      if (target !== undefined) assert.equal(result.target, target);
    });
  }
});

describe('dialogue prompt', () => {
  test('buildNpcPrompt includes npc identity, season, and rumors', () => {
    const npc = { data: { name: 'Maren', personality: 'cryptic and old', memories: [] } };
    const rumors = [{ location_name: 'the Hollow', data: { description: 'someone burned the briar' } }];
    const prompt = buildNpcPrompt(npc, 'do you know the way?', [], rumors, CTX);
    assert.ok(prompt.includes('Maren'));
    assert.ok(prompt.includes('cryptic and old'));
    assert.ok(prompt.includes('Autumn'));
    assert.ok(prompt.includes('burned the briar'));
  });

  test('buildLocationPrompt asks for optional npc and item', () => {
    const from = { data: { name: 'The Edge', atmosphere: 'ancient' } };
    const prompt = buildLocationPrompt('north', from, CTX);
    assert.ok(prompt.includes('"npc"'));
    assert.ok(prompt.includes('"item"'));
  });
});

describe('consequence engine', () => {
  test('buildConsequencePrompt carries ids, inventory, and weather', () => {
    const prompt = buildConsequencePrompt({
      player: { id: 'pet', username: 'pet' },
      location: { id: 'loc_1', data: { name: 'The Hollow' } },
      action: 'burn the briar',
      recentEvents: [],
      npcs: [{ id: 'npc_9', data: { name: 'A Fox' } }],
      items: [{ id: 'item_3', data: { name: 'a bone flute' } }],
      inventory: [{ id: 'item_7', data: { name: 'a dented brass lantern' } }],
      ctx: CTX,
    });
    assert.ok(prompt.includes('id=npc_9'));
    assert.ok(prompt.includes('id=item_3'));
    assert.ok(prompt.includes('dented brass lantern'));
    assert.ok(prompt.includes('cold low fog'));
  });

  test('sanitizeConsequence drops unknown change types and protects the map graph', () => {
    const result = sanitizeConsequence({
      narrative: 'Things happen.',
      changes: [
        { type: 'teleport_player', id: 'x' },
        { type: 'location_patch', id: 'loc_1', patch: { description: 'scorched', connections: { north: 'loc_evil' }, name: 'Hacked' } },
        { type: 'event_log', description: 'fine' },
      ],
    });
    assert.equal(result.changes.length, 2);
    assert.equal(result.changes[0].patch.description, 'scorched');
    assert.equal(result.changes[0].patch.connections, undefined);
    assert.equal(result.changes[0].patch.name, undefined);
  });

  test('sanitizeConsequence supplies a narrative when missing', () => {
    const result = sanitizeConsequence({});
    assert.ok(result.narrative.length > 0);
    assert.deepEqual(result.changes, []);
  });
});
