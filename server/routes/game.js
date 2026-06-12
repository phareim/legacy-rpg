import { Router } from 'express';
import { parseIntent } from '../ai/intent.js';
import {
  streamDialogue, streamAtmosphere, generateLocation,
  streamItemDescription, streamNpcAppearance,
} from '../ai/dialogue.js';
import { reasonConsequence } from '../ai/consequence.js';
import { handleMovement } from '../handlers/movement.js';
import { handleDialogue } from '../handlers/dialogue.js';
import { handleTake, handleDrop, handleExamine, handleInventory } from '../handlers/items.js';
import { handleWorldAction } from '../handlers/world-action.js';
import { getCurrentSeason, getTimeOfDay, getWeather } from '../world/season.js';
import { STARTING_LOCATION_ID } from '../world/seed.js';

const HELP_TEXT = `The wood listens for plain speech. Some things it understands well:
  go north / south / east / west — wander (new ground is born as you walk)
  look — take in your surroundings
  examine <thing> — look closely at an item or a person
  take <thing> / drop <thing> — items persist; what you drop, others find
  talk to <someone> — the inhabitants remember you, and they hear rumors
  inventory — what you carry

Anything else — "carve my name into the oak", "sing to the moon", "build a
cairn" — is taken seriously by the world-engine and may change this place
forever. The world is shared: every scar you leave, other wanderers inherit.`;

// Naive in-memory limiter: world-altering AI calls cost real money.
function makeLimiter(maxPerMinute = 12) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter(t => now - t < 60_000);
    if (recent.length >= maxPerMinute) return false;
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 1000) hits.clear();
    return true;
  };
}

// BFS grid layout for the map, anchored at the starting location.
const DELTA = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };

export function layoutMap(locations) {
  const byId = new Map(locations.map(l => [l.id, l]));
  const coords = new Map();
  const taken = new Set();
  const queue = [];

  if (byId.has(STARTING_LOCATION_ID)) {
    coords.set(STARTING_LOCATION_ID, [0, 0]);
    taken.add('0,0');
    queue.push(STARTING_LOCATION_ID);
  }

  while (queue.length) {
    const id = queue.shift();
    const [x, y] = coords.get(id);
    const connections = byId.get(id)?.data?.connections ?? {};
    for (const [dir, toId] of Object.entries(connections)) {
      if (!toId || coords.has(toId) || !byId.has(toId) || !DELTA[dir]) continue;
      let [nx, ny] = [x + DELTA[dir][0], y + DELTA[dir][1]];
      // The generated graph is not guaranteed planar — nudge collisions aside.
      let radius = 1;
      while (taken.has(`${nx},${ny}`)) {
        nx += DELTA[dir][0] || (radius % 2 ? radius : -radius);
        ny += DELTA[dir][1] || (radius % 2 ? -radius : radius);
        radius++;
      }
      coords.set(toId, [nx, ny]);
      taken.add(`${nx},${ny}`);
      queue.push(toId);
    }
  }
  return coords;
}

export function createGameRouter(db) {
  const router = Router();
  const allowAction = makeLimiter(Number(process.env.ACTIONS_PER_MINUTE ?? 12));

  const worldCtx = () => {
    const season = getCurrentSeason(db);
    return { season, timeOfDay: getTimeOfDay(), weather: getWeather(season) };
  };

  // GET /api/state?player=username
  router.get('/state', (req, res) => {
    const username = String(req.query.player ?? '').trim().slice(0, 40);
    if (!username) return res.status(400).json({ error: 'player param required' });

    const player = db.getOrCreatePlayer(username, STARTING_LOCATION_ID);
    const location = db.getById('locations', player.location_id);
    const ctx = worldCtx();

    res.json({
      player: {
        username: player.username,
        inventory: db.inventory(username).map(i => ({ id: i.id, name: i.data.name })),
      },
      location: {
        id: location.id,
        name: location.data.name,
        atmosphere: location.data.atmosphere,
        exits: Object.entries(location.data.connections ?? {})
          .filter(([, v]) => v).map(([dir]) => dir),
      },
      ...ctx,
      npcs: db.npcsAt(player.location_id).map(n => ({ id: n.id, name: n.data.name })),
      items: db.itemsAt(player.location_id).map(i => ({ id: i.id, name: i.data.name })),
      recentEvents: db.recentEvents(player.location_id, 5).map(e => ({
        type: e.type,
        player: e.player_id,
        description: e.data.description ?? e.type,
        at: e.created_at,
      })),
    });
  });

  // GET /api/map?player=username — the explored world graph
  router.get('/map', (req, res) => {
    const username = String(req.query.player ?? '').trim().slice(0, 40);
    const player = username ? db.getPlayer(username) : null;
    const visited = new Set(player?.data?.visited ?? []);

    const locations = db.allLocations();
    const coords = layoutMap(locations);
    const edges = [];
    const seen = new Set();

    for (const loc of locations) {
      for (const [dir, toId] of Object.entries(loc.data.connections ?? {})) {
        if (!toId) continue;
        const key = [loc.id, toId].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ from: loc.id, to: toId, direction: dir });
      }
    }

    res.json({
      locations: locations.map(l => ({
        id: l.id,
        name: l.data.name,
        visited: visited.has(l.id),
        x: coords.get(l.id)?.[0] ?? null,
        y: coords.get(l.id)?.[1] ?? null,
      })),
      edges,
      playerLocation: player?.location_id ?? null,
    });
  });

  // GET /api/chronicle — the world's permanent memory, newest first
  router.get('/chronicle', (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 30), 100);
    res.json({
      events: db.chronicle(limit).map(e => ({
        type: e.type,
        player: e.player_id,
        location: e.location_name,
        description: e.data.description ?? e.type,
        at: e.created_at,
      })),
    });
  });

  // POST /api/action — streams plain text
  router.post('/action', async (req, res) => {
    const username = String(req.body?.player ?? '').trim().slice(0, 40);
    const input = String(req.body?.input ?? '').trim().slice(0, 500);
    if (!username || !input) {
      return res.status(400).json({ error: 'player and input required' });
    }
    if (!allowAction(`${req.ip}|${username}`)) {
      return res.status(429).json({ error: 'The forest asks for patience. Slow down.' });
    }

    db.getOrCreatePlayer(username, STARTING_LOCATION_ID);
    const ctx = worldCtx();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');

    const onChunk = (chunk) => new Promise((resolve, reject) => {
      const ok = res.write(chunk);
      if (ok) resolve();
      else {
        res.once('drain', resolve);
        res.once('error', reject);
      }
    });

    const ai = {
      generateLocation, streamAtmosphere, streamDialogue,
      streamItemDescription, streamNpcAppearance, reasonConsequence,
    };

    const lookAtCurrent = async () => {
      const player = db.getPlayer(username);
      const location = db.getById('locations', player.location_id);
      await streamAtmosphere(location, ctx, onChunk);
      const npcs = db.npcsAt(player.location_id);
      const items = db.itemsAt(player.location_id);
      if (npcs.length) await onChunk(`\n\nHere: ${npcs.map(n => n.data.name).join(', ')}.`);
      if (items.length) await onChunk(`\nLying about: ${items.map(i => i.data.name).join(', ')}.`);
    };

    try {
      // Deterministic intents skip the classifier entirely.
      const lower = input.toLowerCase();
      const intent =
        ['look', 'look around', 'l'].includes(lower) ? { intent: 'look', target: null } :
        ['inventory', 'inv', 'i'].includes(lower) ? { intent: 'inventory', target: null } :
        ['help', '?'].includes(lower) ? { intent: 'help', target: null } :
        await parseIntent(input);

      switch (intent.intent) {
        case 'help':
          await onChunk(HELP_TEXT);
          break;

        case 'look':
          await lookAtCurrent();
          break;

        case 'inventory':
          await handleInventory(db, username, onChunk);
          break;

        case 'movement': {
          const dir = intent.target;
          if (!['north', 'south', 'east', 'west'].includes(dir)) {
            await onChunk('The wood only opens to the north, south, east, and west.');
            break;
          }
          await handleMovement(db, username, dir, ctx, ai, onChunk);
          break;
        }

        case 'dialogue':
          await handleDialogue(db, username, intent.target, input, ctx, ai, onChunk);
          break;

        case 'take': {
          const handled = await handleTake(db, username, intent.target, onChunk);
          if (!handled) await handleWorldAction(db, username, input, ctx, ai, onChunk);
          break;
        }

        case 'drop':
          await handleDrop(db, username, intent.target, onChunk);
          break;

        case 'examine': {
          if (!intent.target) {
            await lookAtCurrent();
            break;
          }
          const handled = await handleExamine(db, username, intent.target, ctx, ai, onChunk);
          if (!handled) await handleWorldAction(db, username, input, ctx, ai, onChunk);
          break;
        }

        case 'ambiguous':
          await onChunk('You pause. What do you mean, exactly? (Try "help".)');
          break;

        default:
          await handleWorldAction(db, username, input, ctx, ai, onChunk);
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
