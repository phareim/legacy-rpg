# Legacy RPG

Text-based multiplayer RPG — a shared magical forest where every player action permanently alters the world.

## Tech Stack

- Node.js (ESM), Express 4
- SQLite via `better-sqlite3` (JSON columns for entity properties)
- AI: Cloudflare AI (intent), Venice AI (dialogue/atmosphere), Anthropic Claude (world consequences)
- CLI client (`cli/index.js`), streams chunked responses
- PM2 for production process management

## Commands

- `npm run dev` — start API server (port 3010)
- `npm run cli` — run CLI client
- `npm test` — run test suite (node:test)
- `pm2 start ecosystem.config.cjs` — production start

## Key Conventions

- All AI functions are injected as an `ai` parameter object into handlers — never imported directly. This keeps handlers testable without API calls.
- `onChunk` is a backpressure-aware Promise: resolves on `res.write()` or `drain` event.
- Entity tables (`locations`, `npcs`, `items`) use a `data TEXT` JSON column for flexible AI-generated properties.
- Every world-altering action appends to the `events` table (immutable log).
- Intent parsing uses CARDINAL_DIRS (north/south/east/west) matched anywhere, and AMBIGUOUS_DIRS (up/down/back/left/right) only with movement verbs — to avoid shadowing item verbs like "pick up".

## Environment

Server runs on port **3010** (3000 is occupied by `/home/petter/www/server.js`).

`.env` is gitignored — copy from `.env.example`. `data/` (SQLite DB) is also gitignored.
