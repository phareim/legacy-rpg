# Legacy RPG — The Great Wood

Text-based multiplayer RPG — a shared magical forest where every player action
permanently alters the world. Web client + CLI + streaming API.

## Tech Stack

- Node.js (ESM), Express 4
- SQLite via `better-sqlite3` (JSON `data` columns for entity properties)
- AI: Cloudflare AI (intent, optional), Venice AI (dialogue/atmosphere/location
  generation), Anthropic Claude (world consequences, falls back to Venice when
  the key is absent or out of credits)
- Web client in `public/` (vanilla JS, no build step, Tufte-styled with bundled
  ET Book fonts)
- CLI client (`cli/index.js`), streams chunked responses
- PM2 for production process management

## Commands

- `npm run dev` — start API server + web client (port 3010)
- `npm run cli` — run CLI client
- `npm test` — run test suite (node:test, no network)
- `pm2 restart legacy-rpg` — deploy after changes (PM2 runs `server/index.js`)

## Key Conventions

- All AI functions are injected as an `ai` parameter object into handlers —
  never imported directly. This keeps handlers testable without API calls.
- World context (`{season, timeOfDay, weather}`) is computed once per request
  in `routes/game.js` and threaded through handlers as `ctx`.
- `onChunk` is a backpressure-aware Promise: resolves on `res.write()` or
  `drain` event. The streamed body is plain text; lines starting with `✦` are
  "legacy marks" that clients render dimmed/accented.
- Entity tables (`locations`, `npcs`, `items`) use a `data TEXT` JSON column.
  Items live either at a location (`location_id`) or with a player
  (`holder_id`) — never both.
- Every world-altering action appends to the `events` table (immutable log).
  `world-action.js` guarantees an event row per action even when the model
  omits `event_log`.
- Consequence-engine output is sanitized (`sanitizeConsequence`) and scoped:
  changes apply only at the player's current location, and `connections`/
  location `name` are never patchable — the movement system owns the map graph.
- Seasons advance **lazily** from `seasons.started_at` on read
  (`getCurrentSeason`) — there is no timer, and restarts never reset the clock.
- Intent parsing prefers Cloudflare AI, falls back to the deterministic parser
  in `intent.js`. Dialogue verbs are checked before cardinal directions so
  "talk to the spirit of the north wind" stays dialogue.

## Public hosting

Live at **https://sleeper.phareim.no/wood/** — nginx proxies `/wood/` → port
3010 (prefix stripped), so the backend still sees `/`, `/api/...` etc. The web
client derives its base path from `location.pathname` (`BASE` in `app.js`), so
it works unchanged at both `localhost:3010/` (local dev) and `/wood/` (prod).
The nginx `location /wood/` block lives in `/etc/nginx/sites-enabled/sleeper`
with `proxy_buffering off` for streaming. `app.set('trust proxy', 'loopback')`
makes the per-IP rate limiter see real client IPs behind nginx.

## Environment

Server runs on port **3010** (3000 is occupied by `/home/petter/www/server.js`).

`.env` is gitignored — copy from `.env.example`. `data/` (SQLite DB) is also
gitignored. Note: the `ANTHROPIC_API_KEY` on Sleeper currently has **no
credits** — the consequence engine silently falls back to Venice (logged with
`console.warn`).
