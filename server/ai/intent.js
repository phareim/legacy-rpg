import 'dotenv/config';

// Cardinal directions: match anywhere (safe, unambiguous)
const CARDINAL_DIRS = ['north', 'south', 'east', 'west'];
// Ambiguous direction words: only match when used as standalone directions
const AMBIGUOUS_DIRS = ['up', 'down', 'forward', 'back', 'left', 'right'];
const DIALOGUE_WORDS = ['talk', 'speak', 'ask', 'say', 'tell', 'greet', 'chat'];
const ITEM_WORDS = ['pick up', 'take', 'grab', 'drop', 'leave', 'give',
  'examine', 'look at', 'inspect', 'use'];
const WORLD_ACTION_WORDS = ['burn', 'cut', 'carve', 'destroy', 'build',
  'plant', 'pour', 'kill', 'light', 'break', 'write', 'place'];

export function parseIntentFromText(input) {
  const lower = input.toLowerCase().trim();

  if (!lower || lower === '...' || lower.length < 2) {
    return { intent: 'ambiguous', target: null };
  }

  // Check cardinal directions first (safe — unambiguous)
  for (const dir of CARDINAL_DIRS) {
    if (lower.includes(dir)) {
      return { intent: 'movement', target: dir };
    }
  }

  // Check item verbs BEFORE ambiguous direction words to prevent shadowing
  for (const word of ITEM_WORDS) {
    if (lower.includes(word)) {
      let target = lower.replace(word, '').trim();
      target = target.replace(/^(the|a|an)\s+/, '').trim() || null;
      return { intent: 'item', target };
    }
  }

  // Check dialogue verbs
  for (const word of DIALOGUE_WORDS) {
    if (lower.startsWith(word)) {
      let target = lower.replace(new RegExp(`^${word}\\s*(to\\s+)?`), '').trim();
      target = target.replace(/^(the|a|an)\s+/, '').trim() || null;
      return { intent: 'dialogue', target };
    }
  }

  // Ambiguous direction words — only when the input looks like a movement command
  const MOVEMENT_VERBS = ['go', 'walk', 'head', 'move', 'travel', 'run', 'venture'];
  const hasMovementVerb = MOVEMENT_VERBS.some(v => lower.startsWith(v));
  for (const dir of AMBIGUOUS_DIRS) {
    // Match if: input starts with direction, or movement verb is present, or direction is the whole input
    if (lower === dir || (hasMovementVerb && lower.includes(dir))) {
      return { intent: 'movement', target: dir };
    }
  }

  // World action verbs
  for (const word of WORLD_ACTION_WORDS) {
    if (lower.startsWith(word)) {
      return { intent: 'world_action', target: null };
    }
  }

  return { intent: 'world_action', target: null };
}

export async function parseIntent(input) {
  const { CLOUDFLARE_API_TOKEN, CF_ACCOUNT_ID } = process.env;

  if (!CLOUDFLARE_API_TOKEN || !CF_ACCOUNT_ID) {
    return parseIntentFromText(input);
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an intent classifier for a text RPG.
Classify the player's input into exactly one of: movement, dialogue, item, world_action, ambiguous.
Also extract the target (direction, NPC name, item name, or null).
Respond with ONLY valid JSON: {"intent": "...", "target": "..."|null}
Examples:
"go north" → {"intent":"movement","target":"north"}
"talk to the old woman" → {"intent":"dialogue","target":"old woman"}
"pick up the glowing stone" → {"intent":"item","target":"glowing stone"}
"burn the ancient tree" → {"intent":"world_action","target":"ancient tree"}
"what is happening" → {"intent":"ambiguous","target":null}`,
            },
            { role: 'user', content: input },
          ],
          max_tokens: 60,
        }),
      }
    );

    if (!res.ok) return parseIntentFromText(input);

    const body = await res.json();
    const text = body?.result?.response ?? '';
    const match = text.match(/\{[^}]+\}/);
    if (!match) return parseIntentFromText(input);

    const VALID_INTENTS = new Set(['movement', 'dialogue', 'item', 'world_action', 'ambiguous']);
    const parsed = JSON.parse(match[0]);
    if (!parsed.intent || !VALID_INTENTS.has(parsed.intent)) return parseIntentFromText(input);
    return { intent: parsed.intent, target: parsed.target ?? null };
  } catch {
    return parseIntentFromText(input);
  }
}
