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
