import 'dotenv/config';

const DIRECTION_WORDS = ['north', 'south', 'east', 'west', 'up', 'down',
  'forward', 'back', 'left', 'right'];
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

  for (const dir of DIRECTION_WORDS) {
    if (lower.includes(dir)) {
      return { intent: 'movement', target: dir };
    }
  }

  for (const word of DIALOGUE_WORDS) {
    if (lower.startsWith(word)) {
      const target = lower
        .replace(new RegExp(`^${word}\\s*(to\\s+)?`), '')
        .replace(/^(the|a|an)\s+/, '')
        .trim() || null;
      return { intent: 'dialogue', target };
    }
  }

  for (const word of ITEM_WORDS) {
    if (lower.includes(word)) {
      const target = lower.replace(word, '').trim() || null;
      return { intent: 'item', target };
    }
  }

  for (const word of WORLD_ACTION_WORDS) {
    if (lower.startsWith(word)) {
      return { intent: 'world_action', target: null };
    }
  }

  // Anything else with clear subject-verb structure → world_action
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

    const parsed = JSON.parse(match[0]);
    if (!parsed.intent) return parseIntentFromText(input);
    return { intent: parsed.intent, target: parsed.target ?? null };
  } catch {
    return parseIntentFromText(input);
  }
}
