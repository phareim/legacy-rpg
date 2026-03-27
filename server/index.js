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
}, SEASON_DURATION_HOURS * 60 * 60 * 1000).unref();

app.listen(PORT, () => {
  const season = getCurrentSeason(db);
  console.log(`Legacy RPG server running on :${PORT} | Season: ${season}`);
});
