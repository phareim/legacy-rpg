# Legacy RPG

A text-based multiplayer RPG set in a shared magical forest. Every action by any player has permanent consequences on the world. AI generates locations, NPCs, dialogue, and world changes dynamically.

## Concept

Players wander an infinite, procedurally generated forest. The world is persistent and shared — what you do affects what others find. Locations are created on demand, NPCs remember conversations, and actions alter the world permanently.

## Architecture

- **Express API server** — handles all game actions via `/api/action` and `/api/state`
- **SQLite** — single shared world database with JSON columns for flexible entity properties
- **CLI client** — thin terminal client, streams responses in real time
- **AI routing**:
  - Cloudflare AI (Llama 3.1) — intent parsing
  - Venice AI — NPC dialogue and location atmosphere (streaming)
  - Claude (Anthropic) — world consequence reasoning

## Project Structure

```
server/
  index.js          — startup, DB seed, season timer
  db.js             — SQLite helpers
  routes/game.js    — POST /api/action, GET /api/state
  ai/
    intent.js       — parse player input to game intent
    dialogue.js     — NPC conversation + location atmosphere
    consequence.js  — Claude world change reasoning
  handlers/
    movement.js     — travel between locations
    dialogue.js     — talk to NPCs
    world-action.js — world-altering actions
  world/
    seed.js         — starting location + location creation
    season.js       — season + time of day
cli/
  index.js          — terminal client
database/
  schema.sql        — table definitions
test/               — node:test suite
```

## Setup

```bash
cp .env.example .env
# fill in API keys
npm install
npm run dev
```

### Environment Variables

See `.env.example`. Key vars:

| Var | Description |
|-----|-------------|
| `VENICE_API_KEY` | Venice AI key |
| `VENICE_MODEL` | Model name (default: `zai-org-glm-5`) |
| `CF_ACCOUNT_ID` | Cloudflare account ID |
| `CF_API_TOKEN` | Cloudflare API token |
| `ANTHROPIC_API_KEY` | Anthropic key |
| `PORT` | Server port (default: 3010) |
| `DB_PATH` | SQLite path (default: `./data/world.db`) |

## Running

```bash
# Server
npm run dev

# CLI (in another terminal)
PLAYER=yourname legacy-rpg
# or set PLAYER in your shell environment
```

## Production (PM2)

```bash
pm2 start ecosystem.config.cjs
```

## Testing

```bash
npm test
```
