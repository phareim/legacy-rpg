# Legacy RPG — The Great Wood

A text-based multiplayer RPG set in a shared magical forest. **Every action by
any player permanently alters the world**, and other wanderers inherit what you
leave behind. AI generates locations, inhabitants, dialogue, and world
consequences on demand.

## What makes it tick

- **The world is born as you walk.** Unexplored directions generate new
  locations on arrival — about one in three comes with an inhabitant or a
  curious item.
- **Consequences are permanent.** Free-form actions ("carve a spiral into the
  oldest boulder") go to a consequence engine that decides what really happens
  and writes it into the world: locations are re-described, items appear, NPCs
  are summoned or driven off.
- **The world is shared.** Arriving somewhere surfaces ✦ *legacy marks* — what
  other players did there. Items dropped are found by others.
- **NPCs remember and gossip.** Inhabitants keep per-player memories, and the
  rumor mill carries word of events from elsewhere in the wood into their
  dialogue.
- **The Chronicle** is the world's append-only memory — browsable in both
  clients.
- **Seasons & weather.** Seasons advance on a real-time clock (lazily computed
  from the DB, so restarts never reset it); weather is deterministic per day.
  Both flavor every AI prompt.

## Architecture

- **Express API server** — game actions via `POST /api/action` (streamed plain
  text), world state via `GET /api/state`, plus `/api/map` and `/api/chronicle`
- **SQLite** — single shared world DB, JSON `data` columns for AI-generated
  properties, immutable `events` log
- **Web client** — `public/`, vanilla JS, Tufte-styled (warm paper, ET Book,
  one crimson accent), streaming story column + margin notes + SVG world map
- **CLI client** — `cli/index.js`, streams responses; `/map`, `/chronicle`
- **AI routing** (all injected into handlers as an `ai` object — testable
  without API calls):
  - Cloudflare AI (Llama 3.1) — intent classification, with a deterministic
    regex fallback
  - Venice AI — NPC dialogue, location atmosphere, location generation
    (streaming where it matters)
  - Claude (Anthropic) — world consequence reasoning, with automatic Venice
    fallback when the key is missing or out of credits

Consequence output is sanitized before it touches the database: only known
change types, only ids the model was shown, never the map graph
(`connections`), and changes can only reach the player's current location.

## Project Structure

```
server/
  index.js          — startup, DB seed, static hosting
  db.js             — SQLite helpers (fuzzy name match, rumors, chronicle…)
  routes/game.js    — /api/action, /api/state, /api/map, /api/chronicle
  ai/
    intent.js       — intent classification + fallback parser
    dialogue.js     — Venice client: dialogue, atmosphere, location gen
    consequence.js  — consequence engine (Claude → Venice fallback) + sanitizer
  handlers/
    movement.js     — travel, location creation, legacy marks
    dialogue.js     — NPC conversation, memories, rumors
    items.js        — take / drop / examine / inventory (deterministic)
    world-action.js — applies sanctioned consequence changes
  world/
    seed.js         — starting location, Old Maren, the lantern; creation
    season.js       — lazy season clock, time of day, daily weather
public/             — web client (no build step; ET Book bundled)
cli/index.js        — terminal client
database/schema.sql — table definitions
test/               — node:test suite (54 tests, no network)
```

## Setup

```bash
cp .env.example .env   # fill in API keys
npm install
npm run dev            # server on :3010
```

| Var | Description |
|-----|-------------|
| `VENICE_API_KEY` | Venice AI key (dialogue, atmosphere, location gen) |
| `VENICE_MODEL` | Model name (default `zai-org-glm-5`) |
| `CF_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` | Cloudflare AI for intent parsing (optional — falls back to regex parser) |
| `ANTHROPIC_API_KEY` | Claude for world consequences (optional — falls back to Venice) |
| `PORT` | Server port (default 3010) |
| `DB_PATH` | SQLite path (default `./data/world.db`) |
| `SEASON_DURATION_HOURS` | Real hours per season (default 168 = one week) |
| `ACTIONS_PER_MINUTE` | Per-player rate limit on `/api/action` (default 12) |

## Playing

```bash
# Web: open http://localhost:3010/ and pick a name

# CLI:
PLAYER=yourname npm run cli
```

The wood understands plain speech: `go north`, `look`, `examine the lantern`,
`take it`, `talk to Maren`, `inventory`, `help` — and anything else is treated
as a world action with permanent consequences. In the CLI, `/map` and
`/chronicle` are local commands.

## Production (PM2)

```bash
pm2 start ecosystem.config.cjs
```

## Testing

```bash
npm test
```

The suite covers handlers, the fallback intent parser, the consequence
sanitizer, the season clock, and the DB helpers — all with fake AI functions,
no network.
