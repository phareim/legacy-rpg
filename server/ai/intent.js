import 'dotenv/config';

export const INTENTS = [
  'movement', 'dialogue', 'take', 'drop', 'examine',
  'look', 'inventory', 'help', 'world_action', 'ambiguous',
];

const CARDINAL_DIRS = ['north', 'south', 'east', 'west'];
const AMBIGUOUS_DIRS = ['up', 'down', 'forward', 'back', 'backwards', 'left', 'right'];
const MOVEMENT_VERBS = ['go', 'walk', 'head', 'move', 'travel', 'run', 'wander', 'venture', 'follow'];
const DIALOGUE_WORDS = ['talk', 'speak', 'ask', 'say', 'tell', 'greet', 'chat', 'whisper', 'shout'];
const TAKE_WORDS = ['take', 'pick up', 'grab', 'collect', 'pocket'];
const DROP_WORDS = ['drop', 'put down', 'leave behind', 'discard'];
const EXAMINE_WORDS = ['examine', 'look at', 'inspect', 'study', 'read', 'observe'];
const LOOK_PHRASES = ['look', 'look around', 'look about', 'where am i', 'survey', 'surroundings'];
const INVENTORY_PHRASES = ['inventory', 'inv', 'i', 'what am i carrying', 'check inventory', 'check my bag', 'pockets'];
const HELP_PHRASES = ['help', 'commands', 'what can i do', '?'];

function word(re) {
  return new RegExp(`(?:^|\\s)${re}(?:\\s|$|[.,!?])`);
}

function stripTarget(lower, verb) {
  let rest = lower.slice(verb.length).trim();
  let prev;
  do {
    prev = rest;
    rest = rest.replace(/^(to|at|with|the|a|an|my)\s+/, '');
  } while (rest !== prev);
  return rest.trim() || null;
}

export function parseIntentFromText(input) {
  const lower = input.toLowerCase().trim().replace(/[.!]+$/, '');

  if (!lower || lower === '...' || (lower.length < 2 && lower !== 'i' && lower !== '?')) {
    return { intent: 'ambiguous', target: null };
  }

  if (LOOK_PHRASES.includes(lower)) return { intent: 'look', target: null };
  if (INVENTORY_PHRASES.includes(lower)) return { intent: 'inventory', target: null };
  if (HELP_PHRASES.includes(lower)) return { intent: 'help', target: null };

  // Dialogue first — "talk to the spirit of the north wind" must not become movement.
  for (const verb of DIALOGUE_WORDS) {
    if (lower.startsWith(`${verb} `) || lower === verb) {
      const target = lower.replace(new RegExp(`^${verb}\\s*(to|with)?\\s*`), '')
        .replace(/^(the|a|an)\s+/, '').trim() || null;
      return { intent: 'dialogue', target };
    }
  }

  for (const verb of EXAMINE_WORDS) {
    if (lower.startsWith(`${verb} `)) {
      return { intent: 'examine', target: stripTarget(lower, verb) };
    }
  }
  for (const verb of TAKE_WORDS) {
    if (lower.startsWith(`${verb} `)) {
      return { intent: 'take', target: stripTarget(lower, verb) };
    }
  }
  for (const verb of DROP_WORDS) {
    if (lower.startsWith(`${verb} `)) {
      return { intent: 'drop', target: stripTarget(lower, verb) };
    }
  }

  // Cardinal directions as words (not substrings — "northwind" should not match).
  for (const dir of CARDINAL_DIRS) {
    if (word(dir).test(lower)) return { intent: 'movement', target: dir };
  }

  // Ambiguous direction words only alongside an explicit movement verb, or alone.
  const hasMovementVerb = MOVEMENT_VERBS.some(v => lower.startsWith(`${v} `));
  for (const dir of AMBIGUOUS_DIRS) {
    if (lower === dir || (hasMovementVerb && word(dir).test(lower))) {
      return { intent: 'movement', target: dir };
    }
  }

  // Everything else is an attempt to act on the world — the consequence
  // engine decides what actually happens.
  return { intent: 'world_action', target: null };
}

export async function parseIntent(input) {
  const { CLOUDFLARE_API_TOKEN, CF_ACCOUNT_ID } = process.env;
  if (!CLOUDFLARE_API_TOKEN || !CF_ACCOUNT_ID) return parseIntentFromText(input);

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
Classify the player's input into exactly one of:
movement, dialogue, take, drop, examine, look, inventory, help, world_action, ambiguous.
Also extract the target (a direction, NPC name, or item name) or null.
Respond with ONLY valid JSON: {"intent": "...", "target": "..."|null}
Examples:
"go north" → {"intent":"movement","target":"north"}
"talk to the old woman" → {"intent":"dialogue","target":"old woman"}
"pick up the glowing stone" → {"intent":"take","target":"glowing stone"}
"drop the lantern" → {"intent":"drop","target":"lantern"}
"examine the runes" → {"intent":"examine","target":"runes"}
"look around" → {"intent":"look","target":null}
"what am I carrying?" → {"intent":"inventory","target":null}
"burn the ancient tree" → {"intent":"world_action","target":"ancient tree"}
"sing to the moon" → {"intent":"world_action","target":"moon"}
"asdfgh" → {"intent":"ambiguous","target":null}`,
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
    if (!parsed.intent || !INTENTS.includes(parsed.intent)) return parseIntentFromText(input);
    return { intent: parsed.intent, target: parsed.target ?? null };
  } catch {
    return parseIntentFromText(input);
  }
}
