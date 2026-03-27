import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseIntentFromText } from '../server/ai/intent.js';
import { buildNpcPrompt } from '../server/ai/dialogue.js';
import { buildConsequencePrompt } from '../server/ai/consequence.js';

describe('intent parsing', () => {
  test('parseIntentFromText parses movement', () => {
    const result = parseIntentFromText('go north');
    assert.equal(result.intent, 'movement');
    assert.equal(result.target, 'north');
  });

  test('parseIntentFromText parses dialogue', () => {
    const result = parseIntentFromText('talk to the old woman');
    assert.equal(result.intent, 'dialogue');
    assert.equal(result.target, 'old woman');
  });

  test('parseIntentFromText parses world_action', () => {
    const result = parseIntentFromText('burn the ancient tree');
    assert.equal(result.intent, 'world_action');
  });

  test('parseIntentFromText returns ambiguous for unclear input', () => {
    const result = parseIntentFromText('...');
    assert.equal(result.intent, 'ambiguous');
  });
});

describe('dialogue prompt', () => {
  test('buildNpcPrompt includes npc name and personality', () => {
    const npc = { data: { name: 'Maren', personality: 'cryptic and old', memories: [] } };
    const prompt = buildNpcPrompt(npc, 'do you know the way?', [], 'Autumn', 'dusk');
    assert.ok(prompt.includes('Maren'));
    assert.ok(prompt.includes('cryptic and old'));
    assert.ok(prompt.includes('Autumn'));
  });
});

describe('consequence prompt', () => {
  test('buildConsequencePrompt includes action and location', () => {
    const location = { data: { name: 'The Hollow Oak' } };
    const player = { username: 'wanderer' };
    const prompt = buildConsequencePrompt(player, location, 'carve a rune into the bark', [], 'Spring');
    assert.ok(prompt.includes('The Hollow Oak'));
    assert.ok(prompt.includes('carve a rune into the bark'));
    assert.ok(prompt.includes('wanderer'));
  });
});
