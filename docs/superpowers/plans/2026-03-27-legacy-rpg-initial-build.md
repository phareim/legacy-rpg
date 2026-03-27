# Legacy RPG — Initial Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable text-based multiplayer RPG — CLI client + local Express API + SQLite — where a shared magical forest evolves permanently based on player actions.

**Architecture:** A thin Node.js CLI sends typed natural language to an Express API server. The server classifies intent via Cloudflare AI, routes to a handler (movement, dialogue, world-action), calls Venice or Claude as appropriate, streams the response back to the CLI, and writes any world changes to SQLite.

**Tech Stack:** Node.js v22 (ESM), Express 4, better-sqlite3, Anthropic SDK, Venice AI (OpenAI-compatible REST), Cloudflare AI (REST), node:test for testing, PM2 for process management.

---

## File Map

```
legacy-rpg/
├── package.json
├── .env.example
├── .gitignore
├── ecosystem.config.cjs          # PM2 process config
├── data/                         # gitignored — SQLite db lives here
├── database/
│   └── schema.sql                # All table definitions
├── server/
│   ├── index.js                  # Express app entry point
│   ├── db.js                     # SQLite connection + CRUD helpers
│   ├── world/
│   │   ├── season.js             # Season + time-of-day logic
│   │   └── seed.js               # Generate starting location on first boot
│   ├── ai/
│   │   ├── intent.js             # Cloudflare AI: classify player input
│   │   ├── dialogue.js           # Venice: NPC dialogue + location atmosphere
│   │   └── consequence.js        # Claude: reason world-altering changes
│   ├── handlers/
│   │   ├── movement.js           # Move player, generate new locations
│   │   ├── dialogue.js           # Route NPC conversations
│   │   └── world-action.js       # Apply world-altering actions
│   └── routes/
│       └── game.js               # POST /api/action, GET /api/state
├── cli/
│   └── index.js                  # Interactive terminal client
└── test/
    ├── db.test.js
    ├── season.test.js
    ├── ai.test.js
    └── handlers.test.js
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "legacy-rpg",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "node server/index.js",
    "cli": "node cli/index.js",
    "test": "node --test 'test/**/*.test.js'"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "better-sqlite3": "^11.0.0",
    "dotenv": "^16.4.0",
    "express": "^4.21.0",
    "uuid": "^11.0.0"
  }
}
```

- [ ] **Step 2: Create .env.example**

```
VENICE_API_KEY=your_venice_key_here
CLOUDFLARE_API_TOKEN=your_cloudflare_token_here
CF_ACCOUNT_ID=your_cloudflare_account_id_here
ANTHROPIC_API_KEY=your_anthropic_key_here
PORT=3000
DB_PATH=./data/world.db
SEASON_DURATION_HOURS=168
```

> Note: `CF_ACCOUNT_ID` can be found at dash.cloudflare.com → right sidebar. The token is already in env as `CLOUDFLARE_API_TOKEN`.

- [ ] **Step 3: Create .gitignore**

```
node_modules/
.env
data/
```

- [ ] **Step 4: Create data directory placeholder**

```bash
mkdir -p data
touch data/.gitkeep
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore data/.gitkeep
git commit -m "feat: project scaffold"
```

---

## Task 2: Database Schema and db Module

**Files:**
- Create: `database/schema.sql`
- Create: `server/db.js`
- Create: `test/db.test.js`

- [ ] **Step 1: Write failing test**

Create `test/db.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test test/db.test.js
```

Expected: `Error: Cannot find module '../server/db.js'`

- [ ] **Step 3: Create database/schema.sql**

```sql
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS npcs (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  location_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  location_id TEXT,
  holder_id TEXT,
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  location_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT,
  location_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  type TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  started_at TEXT DEFAULT (datetime('now'))
);
```

- [ ] **Step 4: Create server/db.js**

```javascript
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createDb(path) {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = readFileSync(join(__dirname, '../database/schema.sql'), 'utf8');
  db.exec(schema);

  db.getById = function (table, id) {
    const row = this.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) return null;
    return { ...row, data: JSON.parse(row.data) };
  };

  db.upsert = function (table, id, data, extraFields = {}) {
    const extras = Object.keys(extraFields);
    const cols = ['id', 'data', ...extras].join(', ');
    const placeholders = ['?', '?', ...extras.map(() => '?')].join(', ');
    const updates = ['data = excluded.data', ...extras.map(k => `${k} = excluded.${k}`)].join(', ');
    this.prepare(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updates}`
    ).run(id, JSON.stringify(data), ...extras.map(k => extraFields[k]));
  };

  db.insertEvent = function (playerId, locationId, type, data) {
    this.prepare(
      `INSERT INTO events (player_id, location_id, type, data) VALUES (?, ?, ?, ?)`
    ).run(playerId, locationId, type, JSON.stringify(data));
  };

  db.recentEvents = function (locationId, limit = 20) {
    return this.prepare(
      `SELECT * FROM events WHERE location_id = ? ORDER BY created_at DESC LIMIT ?`
    ).all(locationId, limit).map(row => ({ ...row, data: JSON.parse(row.data) }));
  };

  db.getOrCreatePlayer = function (username, startLocationId) {
    const existing = this.prepare(`SELECT * FROM players WHERE username = ?`).get(username);
    if (existing) return { ...existing, data: JSON.parse(existing.data) };
    this.prepare(
      `INSERT INTO players (id, username, location_id, data) VALUES (?, ?, ?, ?)`
    ).run(username, username, startLocationId, '{}');
    return { id: username, username, location_id: startLocationId, data: {} };
  };

  db.getSeason = function () {
    return this.prepare(`SELECT * FROM seasons ORDER BY id DESC LIMIT 1`).get() ?? null;
  };

  db.insertSeason = function (name) {
    this.prepare(`INSERT INTO seasons (name) VALUES (?)`).run(name);
  };

  return db;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
node --test test/db.test.js
```

Expected: all 7 tests pass, no failures.

- [ ] **Step 6: Commit**

```bash
git add database/schema.sql server/db.js test/db.test.js
git commit -m "feat: database schema and db helpers"
```

---

## Task 3: Season Module

**Files:**
- Create: `server/world/season.js`
- Create: `test/season.test.js`

- [ ] **Step 1: Write failing test**

Create `test/season.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test test/season.test.js
```

Expected: `Error: Cannot find module '../server/world/season.js'`

- [ ] **Step 3: Create server/world/season.js**

```javascript
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

export function initSeason(db) {
  const existing = db.getSeason();
  if (!existing) {
    db.insertSeason('Spring');
  }
}

export function getCurrentSeason(db) {
  const row = db.getSeason();
  return row ? row.name : 'Spring';
}

export function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

// Call this on a schedule to advance seasons.
// Duration: SEASON_DURATION_HOURS (default 168h = 1 week per season).
export function advanceSeason(db) {
  const current = db.getSeason();
  const idx = SEASONS.indexOf(current?.name ?? 'Winter');
  const next = SEASONS[(idx + 1) % SEASONS.length];
  db.insertSeason(next);
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
node --test test/season.test.js
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/world/season.js test/season.test.js
git commit -m "feat: season module"
```

---

## Task 4: AI Modules

**Files:**
- Create: `server/ai/intent.js`
- Create: `server/ai/dialogue.js`
- Create: `server/ai/consequence.js`
- Create: `test/ai.test.js`

All three modules accept their dependencies as parameters so they can be tested without real API calls.

- [ ] **Step 1: Write failing test**

Create `test/ai.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test test/ai.test.js
```

Expected: `Error: Cannot find module '../server/ai/intent.js'`

- [ ] **Step 3: Create server/ai/intent.js**

`parseIntentFromText` is a synchronous local parser used in tests and as a fallback. `parseIntent` is the async version that calls Cloudflare AI and falls back to local parsing on failure.

```javascript
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
      const target = lower.replace(new RegExp(`^${word}\\s*(to\\s+)?`), '').trim() || null;
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
```

- [ ] **Step 4: Create server/ai/dialogue.js**

```javascript
import 'dotenv/config';

export function buildNpcPrompt(npc, playerInput, recentEvents, season, timeOfDay) {
  const { name, personality, memories = [], mood = 'neutral' } = npc.data;
  const recentHistory = recentEvents
    .slice(0, 10)
    .map(e => `- ${e.data.description ?? e.type}`)
    .join('\n');

  return `You are ${name}, an NPC in a magical forest RPG.
Personality: ${personality}
Current mood: ${mood}
Season: ${season}, time of day: ${timeOfDay}

Your memories of this player:
${memories.length ? memories.map(m => `- ${m}`).join('\n') : '(none yet)'}

Recent events nearby:
${recentHistory || '(nothing notable)'}

The player says: "${playerInput}"

Respond in character as ${name}. Be vivid, atmospheric, and true to your personality.
Keep your response to 2-4 sentences. Do not break character.`;
}

export function buildLocationPrompt(direction, fromLocation, season, timeOfDay) {
  const from = fromLocation.data;
  return `You are narrating a magical forest RPG.
A wanderer travels ${direction} from "${from.name}" (${from.atmosphere ?? 'mysterious'}).
Season: ${season}, time of day: ${timeOfDay}.

Generate a new forest location they arrive at. Respond with ONLY valid JSON:
{
  "name": "evocative location name",
  "description": "2-3 sentence atmospheric description",
  "atmosphere": "2-3 adjectives",
  "connections": {"north": null, "south": null, "east": null, "west": null}
}
Make it feel alive, magical, and distinct. The forest is ancient and full of wonder.`;
}

export async function streamDialogue(npc, playerInput, recentEvents, season, timeOfDay, onChunk) {
  const { VENICE_API_KEY } = process.env;
  const prompt = buildNpcPrompt(npc, playerInput, recentEvents, season, timeOfDay);

  const res = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.VENICE_MODEL ?? 'zai-org-glm-5',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  if (!res.ok) throw new Error(`Venice error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t || t === 'data: [DONE]') continue;
      if (!t.startsWith('data: ')) continue;
      try {
        const chunk = JSON.parse(t.slice(6));
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) await onChunk(delta);
      } catch {}
    }
  }
}

export async function generateLocation(direction, fromLocation, season, timeOfDay) {
  const { VENICE_API_KEY } = process.env;
  const prompt = buildLocationPrompt(direction, fromLocation, season, timeOfDay);

  const res = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.VENICE_MODEL ?? 'zai-org-glm-5',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Venice error: ${res.status}`);
  const body = await res.json();
  const text = body.choices?.[0]?.message?.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Venice returned no JSON for location');
  return JSON.parse(match[0]);
}

export async function streamAtmosphere(location, season, timeOfDay, onChunk) {
  const { VENICE_API_KEY } = process.env;
  const { name, description, atmosphere } = location.data;
  const prompt = `You are narrating a magical forest RPG.
A wanderer arrives at "${name}".
Base description: ${description}
Atmosphere: ${atmosphere}
Season: ${season}, time of day: ${timeOfDay}.

Write a vivid 2-3 sentence arrival description. Make it feel alive and present-tense.`;

  const res = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.VENICE_MODEL ?? 'zai-org-glm-5',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  if (!res.ok) throw new Error(`Venice error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t || t === 'data: [DONE]') continue;
      if (!t.startsWith('data: ')) continue;
      try {
        const chunk = JSON.parse(t.slice(6));
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) await onChunk(delta);
      } catch {}
    }
  }
}
```

- [ ] **Step 5: Create server/ai/consequence.js**

```javascript
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

export function buildConsequencePrompt(player, location, action, recentEvents, season) {
  const recentHistory = recentEvents
    .slice(0, 15)
    .map(e => `[${e.created_at}] ${e.data.description ?? e.type}`)
    .join('\n');

  return `You are the world-engine of a magical forest RPG. A player has taken an action that may permanently change the world.

Player: ${player.username}
Location: ${location.data.name} — ${location.data.description}
Season: ${season}
Action: "${action}"

Recent events at this location:
${recentHistory || '(none)'}

Decide what actually happens and what permanently changes. Respond with ONLY valid JSON:
{
  "narrative": "2-3 sentence description of what happens, vivid and consequential",
  "changes": [
    // Include only changes that actually apply. Types:
    // {"type": "location_patch", "id": "${location.id}", "patch": {key: value, ...}}
    // {"type": "npc_patch", "id": "npc_id", "patch": {key: value, ...}}
    // {"type": "item_move", "id": "item_id", "location_id": "loc_id", "holder_id": null}
    // {"type": "item_create", "location_id": "loc_id", "data": {name, description, ...}}
    // {"type": "event_log", "description": "one-line summary of what happened"}
  ]
}

The world is magical and alive. Actions have real, lasting consequences. Be creative but coherent.`;
}

export async function reasonConsequence(player, location, action, recentEvents, season) {
  const client = new Anthropic();
  const prompt = buildConsequencePrompt(player, location, action, recentEvents, season);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Claude returned no JSON for consequence');
  return JSON.parse(match[0]);
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
node --test test/ai.test.js
```

Expected: all 6 tests pass (these test only pure functions, no API calls).

- [ ] **Step 7: Commit**

```bash
git add server/ai/intent.js server/ai/dialogue.js server/ai/consequence.js test/ai.test.js
git commit -m "feat: AI modules — intent, dialogue, consequence"
```

---

## Task 5: World Seed

**Files:**
- Create: `server/world/seed.js`

- [ ] **Step 1: Create server/world/seed.js**

The starting location is hardcoded so the server can boot without an API call. Future locations are AI-generated.

```javascript
import { v4 as uuidv4 } from 'uuid';

export const STARTING_LOCATION_ID = 'loc_start';

export function seedWorld(db) {
  const existing = db.getById('locations', STARTING_LOCATION_ID);
  if (existing) return;

  db.upsert('locations', STARTING_LOCATION_ID, {
    name: 'The Edge of the Great Wood',
    description:
      'You stand at the threshold of an ancient forest. Gnarled oaks stretch skyward, their branches interlaced like the fingers of old hands. A narrow path winds north into the deeper wood. Moss-covered stones mark where the path begins.',
    atmosphere: 'ancient, expectant, alive',
    connections: { north: null, south: null, east: null, west: null },
    seasonal: {},
  });
}

export function linkLocations(db, fromId, direction, toId) {
  const from = db.getById('locations', fromId);
  if (!from) throw new Error(`Location ${fromId} not found`);

  const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' };
  const connections = { ...from.data.connections, [direction]: toId };
  db.upsert('locations', fromId, { ...from.data, connections });

  const to = db.getById('locations', toId);
  if (to) {
    const toConnections = { ...to.data.connections, [opposite[direction]]: fromId };
    db.upsert('locations', toId, { ...to.data, connections: toConnections });
  }
}

export async function createLocation(db, fromLocationId, direction, generateLocationFn) {
  const from = db.getById('locations', fromLocationId);
  if (!from) throw new Error(`Source location ${fromLocationId} not found`);

  const newId = `loc_${uuidv4().slice(0, 8)}`;
  const locationData = await generateLocationFn(direction, from);

  db.upsert('locations', newId, {
    ...locationData,
    connections: { north: null, south: null, east: null, west: null },
  });

  linkLocations(db, fromLocationId, direction, newId);
  return newId;
}
```

- [ ] **Step 2: Verify seed works with a quick smoke test**

```bash
node -e "
import('./server/db.js').then(({ createDb }) => {
  import('./server/world/seed.js').then(({ seedWorld, STARTING_LOCATION_ID }) => {
    const db = createDb(':memory:');
    seedWorld(db);
    const loc = db.getById('locations', STARTING_LOCATION_ID);
    console.log('Seed location:', loc.data.name);
    db.close();
  });
});
"
```

Expected output: `Seed location: The Edge of the Great Wood`

- [ ] **Step 3: Commit**

```bash
git add server/world/seed.js
git commit -m "feat: world seed — starting location"
```

---

## Task 6: Game Handlers

**Files:**
- Create: `server/handlers/movement.js`
- Create: `server/handlers/dialogue.js`
- Create: `server/handlers/world-action.js`
- Create: `test/handlers.test.js`

Handlers accept AI functions as injected dependencies so they're testable without network calls.

- [ ] **Step 1: Write failing test**

Create `test/handlers.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test test/handlers.test.js
```

Expected: `Error: Cannot find module '../server/handlers/movement.js'`

- [ ] **Step 3: Create server/handlers/movement.js**

```javascript
import { createLocation, STARTING_LOCATION_ID } from '../world/seed.js';

export async function handleMovement(db, username, direction, season, timeOfDay, ai, onChunk) {
  const player = db.prepare('SELECT * FROM players WHERE username = ?').get(username);
  if (!player) {
    await onChunk('You do not exist in this world yet.');
    return;
  }

  const currentLocation = db.getById('locations', player.location_id);
  const connections = currentLocation?.data?.connections ?? {};
  let targetId = connections[direction];

  if (!targetId) {
    await onChunk(`You push deeper into the wood, heading ${direction}...\n\n`);
    targetId = await createLocation(db, player.location_id, direction, ai.generateLocation);
  }

  db.prepare('UPDATE players SET location_id = ? WHERE username = ?').run(targetId, username);
  db.insertEvent(username, targetId, 'movement', {
    direction,
    from: player.location_id,
    description: `${username} arrived from the ${oppositeDirection(direction)}`,
  });

  const newLocation = db.getById('locations', targetId);
  const npcs = db.prepare('SELECT * FROM npcs WHERE location_id = ?').all(targetId)
    .map(n => ({ ...n, data: JSON.parse(n.data) }));
  const items = db.prepare('SELECT * FROM items WHERE location_id = ?').all(targetId)
    .map(i => ({ ...i, data: JSON.parse(i.data) }));

  await ai.streamAtmosphere(newLocation, season, timeOfDay, onChunk);

  if (npcs.length > 0) {
    await onChunk(`\n\nYou notice: ${npcs.map(n => n.data.name).join(', ')}.`);
  }
  if (items.length > 0) {
    await onChunk(`\nNearby: ${items.map(i => i.data.name).join(', ')}.`);
  }
}

function oppositeDirection(dir) {
  return { north: 'south', south: 'north', east: 'west', west: 'east' }[dir] ?? dir;
}
```

- [ ] **Step 4: Create server/handlers/dialogue.js**

```javascript
export async function handleDialogue(db, username, target, input, season, timeOfDay, ai, onChunk) {
  const player = db.prepare('SELECT * FROM players WHERE username = ?').get(username);
  const npcs = db.prepare('SELECT * FROM npcs WHERE location_id = ?')
    .all(player.location_id)
    .map(n => ({ ...n, data: JSON.parse(n.data) }));

  const npc = npcs.find(n =>
    n.data.name?.toLowerCase().includes(target?.toLowerCase() ?? '')
  );

  if (!npc) {
    await onChunk(`There is no one called "${target}" here.`);
    return;
  }

  const recentEvents = db.recentEvents(player.location_id, 10);
  await ai.streamDialogue(npc, input, recentEvents, season, timeOfDay, onChunk);

  // Update NPC memory with this interaction summary
  const memories = npc.data.memories ?? [];
  memories.unshift(`${username} asked: "${input.slice(0, 60)}"`);
  db.upsert('npcs', npc.id, { ...npc.data, memories: memories.slice(0, 20) },
    { location_id: npc.location_id });

  db.insertEvent(username, player.location_id, 'dialogue', {
    npc: npc.data.name,
    description: `${username} spoke with ${npc.data.name}`,
  });
}
```

- [ ] **Step 5: Create server/handlers/world-action.js**

```javascript
import { v4 as uuidv4 } from 'uuid';

export async function handleWorldAction(db, username, input, season, ai, onChunk) {
  const player = db.prepare('SELECT * FROM players WHERE username = ?').get(username);
  const location = db.getById('locations', player.location_id);
  const recentEvents = db.recentEvents(player.location_id, 15);

  const consequence = await ai.reasonConsequence(
    { ...player, data: JSON.parse(player.data) },
    location,
    input,
    recentEvents,
    season
  );

  await onChunk(consequence.narrative);

  for (const change of consequence.changes ?? []) {
    applyChange(db, change, player.location_id, username);
  }
}

function applyChange(db, change, locationId, username) {
  switch (change.type) {
    case 'location_patch': {
      const loc = db.getById('locations', change.id ?? locationId);
      if (loc) db.upsert('locations', loc.id, { ...loc.data, ...change.patch });
      break;
    }
    case 'npc_patch': {
      const npc = db.getById('npcs', change.id);
      if (npc) db.upsert('npcs', npc.id, { ...npc.data, ...change.patch },
        { location_id: npc.location_id });
      break;
    }
    case 'item_move': {
      const item = db.getById('items', change.id);
      if (item) db.upsert('items', item.id, item.data,
        { location_id: change.location_id ?? null, holder_id: change.holder_id ?? null });
      break;
    }
    case 'item_create': {
      const newId = `item_${uuidv4().slice(0, 8)}`;
      db.upsert('items', newId, change.data, { location_id: change.location_id ?? locationId });
      break;
    }
    case 'event_log': {
      db.insertEvent(username, locationId, 'world_action', {
        description: change.description,
      });
      break;
    }
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
node --test test/handlers.test.js
```

Expected: all 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/handlers/movement.js server/handlers/dialogue.js \
  server/handlers/world-action.js test/handlers.test.js
git commit -m "feat: game handlers — movement, dialogue, world-action"
```

---

## Task 7: Express API

**Files:**
- Create: `server/routes/game.js`
- Create: `server/index.js`

- [ ] **Step 1: Create server/routes/game.js**

```javascript
import { Router } from 'express';
import { parseIntent } from '../ai/intent.js';
import { streamDialogue, streamAtmosphere, generateLocation } from '../ai/dialogue.js';
import { reasonConsequence } from '../ai/consequence.js';
import { handleMovement } from '../handlers/movement.js';
import { handleDialogue } from '../handlers/dialogue.js';
import { handleWorldAction } from '../handlers/world-action.js';
import { getCurrentSeason, getTimeOfDay } from '../world/season.js';
import { seedWorld, STARTING_LOCATION_ID } from '../world/seed.js';

export function createGameRouter(db) {
  const router = Router();

  // GET /api/state?player=username
  router.get('/state', (req, res) => {
    const username = req.query.player;
    if (!username) return res.status(400).json({ error: 'player param required' });

    seedWorld(db);
    const player = db.getOrCreatePlayer(username, STARTING_LOCATION_ID);
    const location = db.getById('locations', player.location_id);
    const season = getCurrentSeason(db);
    const timeOfDay = getTimeOfDay();
    const recentEvents = db.recentEvents(player.location_id, 5);
    const npcs = db.prepare('SELECT * FROM npcs WHERE location_id = ?')
      .all(player.location_id)
      .map(n => ({ id: n.id, name: JSON.parse(n.data).name }));
    const items = db.prepare('SELECT * FROM items WHERE location_id = ?')
      .all(player.location_id)
      .map(i => ({ id: i.id, name: JSON.parse(i.data).name }));

    res.json({
      player: { username: player.username, inventory: player.data?.inventory ?? [] },
      location: { id: location.id, ...location.data },
      season,
      timeOfDay,
      npcs,
      items,
      recentEvents: recentEvents.map(e => ({
        type: e.type,
        description: e.data.description ?? e.type,
        at: e.created_at,
      })),
    });
  });

  // POST /api/action — streams plain text response
  router.post('/action', async (req, res) => {
    const { player: username, input } = req.body;
    if (!username || !input) {
      return res.status(400).json({ error: 'player and input required' });
    }

    seedWorld(db);
    db.getOrCreatePlayer(username, STARTING_LOCATION_ID);

    const season = getCurrentSeason(db);
    const timeOfDay = getTimeOfDay();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');

    const onChunk = async (chunk) => {
      res.write(chunk);
    };

    try {
      const intent = await parseIntent(input);

      if (intent.intent === 'ambiguous') {
        res.end(`You pause. What do you mean exactly? Try being more specific.`);
        return;
      }

      if (intent.intent === 'movement') {
        const dir = intent.target;
        const validDirs = ['north', 'south', 'east', 'west'];
        if (!validDirs.includes(dir)) {
          res.end(`You can go north, south, east, or west.`);
          return;
        }
        await handleMovement(db, username, dir, season, timeOfDay,
          { generateLocation, streamAtmosphere }, onChunk);

      } else if (intent.intent === 'dialogue') {
        await handleDialogue(db, username, intent.target, input, season, timeOfDay,
          { streamDialogue }, onChunk);

      } else {
        // item or world_action both go through consequence reasoning
        await handleWorldAction(db, username, input, season,
          { reasonConsequence }, onChunk);
      }

      res.end();
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.status(500).end('Something stirred in the dark. Try again.');
      else res.end('\n\n[The forest goes quiet. Something went wrong.]');
    }
  });

  return router;
}
```

- [ ] **Step 2: Create server/index.js**

```javascript
import 'dotenv/config';
import express from 'express';
import { createDb } from './db.js';
import { initSeason, advanceSeason, getCurrentSeason } from './world/season.js';
import { seedWorld } from './world/seed.js';
import { createGameRouter } from './routes/game.js';

const PORT = process.env.PORT ?? 3000;
const DB_PATH = process.env.DB_PATH ?? './data/world.db';
const SEASON_DURATION_HOURS = Number(process.env.SEASON_DURATION_HOURS ?? 168);

const db = createDb(DB_PATH);
initSeason(db);
seedWorld(db);

const app = express();
app.use(express.json());
app.use('/api', createGameRouter(db));

app.get('/health', (_req, res) => res.json({ ok: true }));

// Advance season on schedule
setInterval(() => {
  const next = advanceSeason(db);
  console.log(`Season advanced to: ${next}`);
}, SEASON_DURATION_HOURS * 60 * 60 * 1000);

app.listen(PORT, () => {
  const season = getCurrentSeason(db);
  console.log(`Legacy RPG server running on :${PORT} | Season: ${season}`);
});
```

- [ ] **Step 3: Start the server and verify it boots**

Copy `.env.example` to `.env` and fill in real keys first, then:

```bash
node server/index.js
```

Expected output:
```
Legacy RPG server running on :3000 | Season: Spring
```

- [ ] **Step 4: Verify health endpoint**

```bash
curl http://localhost:3000/health
```

Expected: `{"ok":true}`

- [ ] **Step 5: Verify state endpoint**

```bash
curl "http://localhost:3000/api/state?player=wanderer"
```

Expected: JSON with location name "The Edge of the Great Wood", season "Spring".

- [ ] **Step 6: Commit**

```bash
git add server/routes/game.js server/index.js
git commit -m "feat: Express API — /api/state and /api/action"
```

---

## Task 8: CLI Client

**Files:**
- Create: `cli/index.js`

- [ ] **Step 1: Create cli/index.js**

```javascript
#!/usr/bin/env node
import 'dotenv/config';
import readline from 'node:readline';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';
const PLAYER = process.env.PLAYER ?? process.env.USER ?? 'wanderer';

function clearLine() {
  process.stdout.write('\r\x1b[K');
}

function printHeader(state) {
  const { location, season, timeOfDay } = state;
  process.stdout.write(
    `\n\x1b[2m── ${location.name} · ${season} · ${timeOfDay} ──\x1b[0m\n\n`
  );
}

async function fetchState() {
  const res = await fetch(`${API_BASE}/api/state?player=${encodeURIComponent(PLAYER)}`);
  if (!res.ok) throw new Error(`State fetch failed: ${res.status}`);
  return res.json();
}

async function sendAction(input) {
  const res = await fetch(`${API_BASE}/api/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: PLAYER, input }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res;
}

async function streamResponse(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process.stdout.write(decoder.decode(value, { stream: true }));
  }
  process.stdout.write('\n');
}

async function showRecentEvents(state) {
  const others = state.recentEvents?.filter(e => !e.description?.includes(PLAYER));
  if (others?.length > 0) {
    process.stdout.write(`\x1b[2m(${others[0].description})\x1b[0m\n`);
  }
}

async function main() {
  console.log('\x1b[1mThe Great Wood\x1b[0m\n');
  console.log(`You wander as: \x1b[33m${PLAYER}\x1b[0m\n`);

  let state;
  try {
    state = await fetchState();
  } catch (err) {
    console.error(`Cannot reach the forest: ${err.message}`);
    console.error(`Is the server running? (node server/index.js)`);
    process.exit(1);
  }

  printHeader(state);
  await showRecentEvents(state);

  // Show starting location description
  try {
    const res = await sendAction('look around');
    await streamResponse(res);
  } catch {}

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\n\x1b[32m>\x1b[0m ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }
    if (input === 'quit' || input === 'exit') {
      console.log('\nYou step back from the wood. Farewell.\n');
      process.exit(0);
    }

    try {
      const res = await sendAction(input);
      process.stdout.write('\n');
      await streamResponse(res);

      // Refresh header after action
      state = await fetchState();
      printHeader(state);
      await showRecentEvents(state);
    } catch (err) {
      console.error(`\nSomething went wrong: ${err.message}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nFarewell, wanderer.\n');
    process.exit(0);
  });
}

main();
```

- [ ] **Step 2: Make the CLI executable**

```bash
chmod +x cli/index.js
```

- [ ] **Step 3: Run a full end-to-end smoke test**

In one terminal, ensure server is running:
```bash
node server/index.js
```

In another terminal:
```bash
PLAYER=yourname node cli/index.js
```

Expected: You see "The Great Wood", your player name, a location header, and a description of The Edge of the Great Wood. The `>` prompt appears. Type `go north` — you should see a new location generated and described.

- [ ] **Step 4: Commit**

```bash
git add cli/index.js
git commit -m "feat: CLI client with streaming responses"
```

---

## Task 9: PM2 Setup

**Files:**
- Create: `ecosystem.config.cjs`

- [ ] **Step 1: Create ecosystem.config.cjs**

```javascript
module.exports = {
  apps: [
    {
      name: 'legacy-rpg',
      script: 'server/index.js',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '256M',
    },
  ],
};
```

- [ ] **Step 2: Start with PM2**

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

Expected: `legacy-rpg` appears in `pm2 list` with status `online`.

- [ ] **Step 3: Verify server is running via PM2**

```bash
curl http://localhost:3000/health
pm2 logs legacy-rpg --lines 10
```

Expected: `{"ok":true}` and logs showing "Legacy RPG server running on :3000 | Season: Spring".

- [ ] **Step 4: Run full test suite one final time**

```bash
node --test 'test/**/*.test.js'
```

Expected: all tests pass.

- [ ] **Step 5: Commit and push**

```bash
git add ecosystem.config.cjs
git commit -m "feat: PM2 ecosystem config"
git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ CLI client with streaming, natural language input, location header
- ✅ Express API server
- ✅ SQLite with JSON columns for entities
- ✅ Intent parsing via Cloudflare AI (with local fallback)
- ✅ NPC dialogue + atmosphere via Venice
- ✅ Consequence reasoning via Claude
- ✅ Immutable event log
- ✅ Seasons (Spring/Summer/Autumn/Winter, real-time clock)
- ✅ Multiplayer bleed (recent events surfaced to other players in header)
- ✅ Graceful ambiguity (clarifying question)
- ✅ PM2 deployment
- ✅ Browser-extensible (thin CLI → API separation)
- ✅ Item interactions (routed through world-action handler)
- ⚠️ `CF_ACCOUNT_ID` must be set manually — noted in Task 1 .env.example

**No placeholders found.**

**Type consistency:** `handleMovement`, `handleDialogue`, `handleWorldAction` all accept `(db, username, ..., ai, onChunk)` consistently. `db.upsert`, `db.getById`, `db.insertEvent`, `db.recentEvents`, `db.getOrCreatePlayer` defined in Task 2 and used identically throughout.
