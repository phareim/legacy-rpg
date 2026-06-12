# Agent Instructions

Read `./CLAUDE.md` before making substantial changes in this repository.

If a parent directory also contains `AGENTS.md` or `CLAUDE.md`, follow the more
local file when instructions conflict.

## Working Agreement

- Follow existing project conventions before introducing new patterns.
- Run the most relevant tests or checks for the files you change.
- Update docs when changing architecture, APIs, configuration, operational
  workflows, or deployment behavior.
- Do not overwrite unrelated local changes.

## Repo Notes

- `npm test` is required for any server change — the suite is fast and
  network-free (AI functions are injected; tests pass fakes).
- AI functions are **dependency-injected** into handlers as an `ai` object.
  Never import an `ai/*` module from a handler.
- Never let model output touch the DB unsanitized — extend
  `sanitizeConsequence` + `applyChange` together when adding change types.
- The map graph (`locations.data.connections`) is owned by `world/seed.js`
  (`linkLocations`). Nothing else may write it.
- The streamed `/api/action` body is plain text consumed by both the web
  client and the CLI — no ANSI codes server-side; `✦`-prefixed lines are the
  only markup convention.
- `public/` has no build step. Keep it vanilla JS; ET Book fonts are bundled.
- Update `database/schema.sql` directly (it is idempotent `CREATE TABLE IF NOT
  EXISTS`); there is no migration system.
- After deploying changes on Sleeper: `pm2 restart legacy-rpg` and check
  `curl localhost:3010/health`.
