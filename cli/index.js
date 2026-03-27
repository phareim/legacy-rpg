#!/usr/bin/env node
import 'dotenv/config';
import readline from 'node:readline';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3010';
const PLAYER = process.env.PLAYER ?? process.env.USER ?? 'wanderer';

function clearLine() {
  process.stdout.write('\r\x1b[K');
}

function printHeader(state) {
  const { location, season, timeOfDay } = state;
  process.stdout.write(
    `\n\x1b[2m── ${location.name} · ${season} · ${timeOfDay} ──\x1b[0m\n\n`
  );
}

async function fetchState() {
  const res = await fetch(`${API_BASE}/api/state?player=${encodeURIComponent(PLAYER)}`);
  if (!res.ok) throw new Error(`State fetch failed: ${res.status}`);
  return res.json();
}

async function sendAction(input) {
  const res = await fetch(`${API_BASE}/api/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player: PLAYER, input }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res;
}

async function streamResponse(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process.stdout.write(decoder.decode(value, { stream: true }));
  }
  process.stdout.write('\n');
}

async function showRecentEvents(state) {
  const others = state.recentEvents?.filter(e => !e.description?.includes(PLAYER));
  if (others?.length > 0) {
    process.stdout.write(`\x1b[2m(${others[0].description})\x1b[0m\n`);
  }
}

async function main() {
  console.log('\x1b[1mThe Great Wood\x1b[0m\n');
  console.log(`You wander as: \x1b[33m${PLAYER}\x1b[0m\n`);

  let state;
  try {
    state = await fetchState();
  } catch (err) {
    console.error(`Cannot reach the forest: ${err.message}`);
    console.error(`Is the server running? (node server/index.js)`);
    process.exit(1);
  }

  printHeader(state);
  await showRecentEvents(state);

  // Show starting location description
  try {
    const res = await sendAction('look around');
    await streamResponse(res);
  } catch (err) {
    console.error(`\nCould not describe your surroundings: ${err.message}`);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\n\x1b[32m>\x1b[0m ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }
    if (input === 'quit' || input === 'exit') {
      console.log('\nYou step back from the wood. Farewell.\n');
      process.exit(0);
    }

    try {
      const res = await sendAction(input);
      process.stdout.write('\n');
      await streamResponse(res);

      // Refresh header after action
      state = await fetchState();
      printHeader(state);
      await showRecentEvents(state);
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
