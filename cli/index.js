#!/usr/bin/env node
import 'dotenv/config';
import readline from 'node:readline';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3010';
const PLAYER = process.env.PLAYER ?? process.env.USER ?? 'wanderer';

const dim = s => `\x1b[2m${s}\x1b[0m`;
const bold = s => `\x1b[1m${s}\x1b[0m`;
const gold = s => `\x1b[33m${s}\x1b[0m`;
const green = s => `\x1b[32m${s}\x1b[0m`;

function printHeader(state) {
  const { location, season, timeOfDay, weather } = state;
  process.stdout.write(
    `\n${dim(`── ${location.name} · ${season} · ${timeOfDay} · ${weather} ──`)}\n`
  );
}

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

const fetchState = () => fetchJson(`/api/state?player=${encodeURIComponent(PLAYER)}`);

async function sendAction(input) {
  const res = await fetch(`${API_BASE}/api/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: PLAYER, input }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res;
}

async function streamResponse(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    // Dim the legacy marks (lines starting with ✦) as they arrive.
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    for (const line of lines) {
      process.stdout.write((line.startsWith('✦') ? dim(line) : line) + '\n');
    }
  }
  if (pending) process.stdout.write(pending.startsWith('✦') ? dim(pending) : pending);
  process.stdout.write('\n');
}

async function showMap() {
  const map = await fetchJson(`/api/map?player=${encodeURIComponent(PLAYER)}`);
  const placed = map.locations.filter(l => l.x !== null);
  if (placed.length === 0) return console.log(dim('The map is blank.'));

  const xs = placed.map(l => l.x), ys = placed.map(l => l.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const grid = Array.from({ length: (maxY - minY + 1) * 2 - 1 },
    () => Array((maxX - minX + 1) * 4 - 3).fill(' '));

  const cell = l => [(l.x - minX) * 4, (l.y - minY) * 2];
  const byId = new Map(placed.map(l => [l.id, l]));

  for (const e of map.edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b) continue;
    const [ax, ay] = cell(a), [bx, by] = cell(b);
    if (ay === by) for (let x = Math.min(ax, bx) + 1; x < Math.max(ax, bx); x++) grid[ay][x] = '─';
    else if (ax === bx) for (let y = Math.min(ay, by) + 1; y < Math.max(ay, by); y++) grid[y][ax] = '│';
  }
  for (const l of placed) {
    const [x, y] = cell(l);
    grid[y][x] = l.id === map.playerLocation ? '☉' : (l.visited ? '●' : '·');
  }

  console.log('\n' + grid.map(r => '   ' + r.join('')).join('\n'));
  console.log(dim(`\n   ☉ you · ● seen · · known to the wood (${placed.length} places)`));
  const here = byId.get(map.playerLocation);
  if (here) console.log(dim(`   You stand at: ${here.name}`));
}

async function showChronicle() {
  const { events } = await fetchJson('/api/chronicle?limit=15');
  console.log('\n' + bold('The Chronicle of the Wood') + '\n');
  if (events.length === 0) return console.log(dim('  Nothing has happened. Yet.'));
  for (const e of events) {
    console.log(`  ${dim(e.at)} — ${e.description} ${dim(`(${e.location})`)}`);
  }
}

const LOCAL_HELP = `
${bold('Local commands')} (everything else is spoken into the wood):
  /map        — chart of the explored forest
  /chronicle  — the world's permanent record
  /quit       — leave
Try: ${gold('help')} for what the wood itself understands.`;

async function main() {
  console.log(bold('\nThe Great Wood') + '\n');
  console.log(`You wander as: ${gold(PLAYER)}`);
  console.log(dim('Type /map, /chronicle, or anything at all. "quit" to leave.'));

  let state;
  try {
    state = await fetchState();
  } catch (err) {
    console.error(`Cannot reach the forest: ${err.message}`);
    console.error('Is the server running? (npm run dev)');
    process.exit(1);
  }

  printHeader(state);
  const others = state.recentEvents?.filter(e => e.player !== PLAYER) ?? [];
  if (others.length > 0) console.log(dim(`✦ ${others[0].description}`));
  process.stdout.write('\n');

  try {
    await streamResponse(await sendAction('look around'));
  } catch (err) {
    console.error(`\nCould not describe your surroundings: ${err.message}`);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `\n${green('>')} `,
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) return rl.prompt();
    if (['quit', 'exit', '/quit'].includes(input)) {
      console.log('\nYou step back from the wood. Farewell.\n');
      process.exit(0);
    }

    try {
      if (input === '/map') await showMap();
      else if (input === '/chronicle') await showChronicle();
      else if (input === '/help') console.log(LOCAL_HELP);
      else {
        process.stdout.write('\n');
        await streamResponse(await sendAction(input));
        state = await fetchState();
        printHeader(state);
      }
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
