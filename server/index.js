import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb } from './db.js';
import { initSeason, getCurrentSeason } from './world/season.js';
import { seedWorld } from './world/seed.js';
import { createGameRouter } from './routes/game.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT ?? 3010;
const DB_PATH = process.env.DB_PATH ?? './data/world.db';

const db = createDb(DB_PATH);
initSeason(db);
seedWorld(db);

const app = express();
// Behind nginx on loopback — trust X-Forwarded-For so req.ip is the real
// client (rate limiting is keyed on it).
app.set('trust proxy', 'loopback');
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));
app.use('/api', createGameRouter(db));

app.get('/health', (_req, res) => res.json({ ok: true, season: getCurrentSeason(db) }));

// Seasons advance lazily from their stored start time (see world/season.js),
// so no timer is needed and restarts never reset the clock.

app.listen(PORT, () => {
  console.log(`Legacy RPG server running on :${PORT} | Season: ${getCurrentSeason(db)}`);
});
