/* The Great Wood — web client. Vanilla JS, no build step. */

const $ = (sel) => document.querySelector(sel);

const story = $('#story');
const input = $('#prompt-input');
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
};

const urlPlayer = new URLSearchParams(location.search).get('player');
if (urlPlayer) store.set('wanderer-name', urlPlayer.trim().slice(0, 40));
let player = urlPlayer?.trim().slice(0, 40) || store.get('wanderer-name');
let busy = false;

/* ── Name gate ──────────────────────────────────────────────────────────── */

if (!player) {
  $('#gate').hidden = false;
  $('#gate-name').focus();
} else {
  begin();
}

$('#gate-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#gate-name').value.trim().slice(0, 40);
  if (!name) return;
  player = name;
  store.set('wanderer-name', name);
  $('#gate').hidden = true;
  begin();
});

async function begin() {
  $('#signed-in').textContent = `you wander as ${player}`;
  await refreshState();
  await renderMap();
  await act('look around', { silentCmd: true, arrival: true });
  input.focus();
}

/* ── State & margin column ──────────────────────────────────────────────── */

async function refreshState() {
  const res = await fetch(`/api/state?player=${encodeURIComponent(player)}`);
  if (!res.ok) return;
  const s = await res.json();

  $('#almanac').textContent = `${s.season} · ${s.timeOfDay} · ${s.weather}`;
  $('#loc-name').textContent = s.location.name;
  $('#loc-atmosphere').textContent = s.location.atmosphere ?? '';

  renderCompass(s.location.exits ?? []);
  renderList($('#present'), [
    ...s.npcs.map(n => ({ label: n.name, command: `talk to ${n.name}` })),
    ...s.items.map(i => ({ label: `${i.name} (lying here)`, command: `examine ${i.name}` })),
  ], 'no one, and nothing');
  renderList($('#carrying'),
    s.player.inventory.map(i => ({ label: i.name, command: `examine ${i.name}` })),
    'nothing');
}

function renderList(el, entries, emptyText) {
  el.innerHTML = '';
  if (entries.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = emptyText;
    el.appendChild(li);
    return;
  }
  for (const entry of entries) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = entry.label;
    btn.title = entry.command;
    btn.addEventListener('click', () => act(entry.command));
    li.appendChild(btn);
    el.appendChild(li);
  }
}

function renderCompass(exits) {
  const compass = $('#compass');
  compass.innerHTML = '';
  const dirs = { n: 'north', w: 'west', e: 'east', s: 'south' };
  for (const [area, dir] of Object.entries(dirs)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.gridArea = area;
    btn.textContent = dir;
    btn.className = exits.includes(dir) ? 'open' : 'unknown';
    btn.title = exits.includes(dir) ? `go ${dir}` : `go ${dir} — unexplored`;
    btn.addEventListener('click', () => act(`go ${dir}`));
    compass.appendChild(btn);
  }
  const c = document.createElement('span');
  c.className = 'c';
  c.textContent = '·';
  compass.appendChild(c);
}

/* ── Acting & streaming ─────────────────────────────────────────────────── */

const ARRIVAL = /^(go|walk|head|move|travel|run|wander|venture|look|l$|examine|survey)/i;

async function act(command, opts = {}) {
  if (busy || !command) return;
  busy = true;
  input.disabled = true;

  const entry = document.createElement('div');
  entry.className = 'entry';
  if (!opts.silentCmd) {
    const cmd = document.createElement('p');
    cmd.className = 'entry-cmd';
    cmd.textContent = command;
    entry.appendChild(cmd);
  }
  const text = document.createElement('div');
  text.className = 'entry-text entry-streaming';
  text.style.whiteSpace = 'pre-wrap';
  entry.appendChild(text);
  story.appendChild(entry);
  entry.scrollIntoView({ behavior: 'smooth', block: 'end' });

  let raw = '';
  try {
    const res = await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player, input: command }),
    });
    if (!res.ok) {
      raw = (await res.text()) || 'The forest does not answer.';
      try { raw = JSON.parse(raw).error ?? raw; } catch {}
      text.textContent = raw;
    } else {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        text.textContent = raw;
        entry.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    }
  } catch {
    text.textContent = raw || 'The path back to the forest is lost. Is the server awake?';
  }

  finishEntry(text, raw, opts.arrival ?? ARRIVAL.test(command));
  busy = false;
  input.disabled = false;
  input.focus();
  entry.scrollIntoView({ behavior: 'smooth', block: 'end' });

  refreshState();
  renderMap();
}

/* Re-render the streamed plain text as typeset paragraphs + legacy marks. */
function finishEntry(el, raw, isArrival) {
  el.classList.remove('entry-streaming');
  if (!raw.trim()) return;
  el.style.whiteSpace = 'normal';
  el.innerHTML = '';
  if (isArrival) el.classList.add('arrival');

  const blocks = raw.split(/\n+/).map(b => b.trim()).filter(Boolean);
  for (const block of blocks) {
    if (block.startsWith('✦')) {
      const mark = document.createElement('p');
      mark.className = 'legacy-mark';
      mark.textContent = block.replace(/^✦\s*/, '');
      el.appendChild(mark);
    } else {
      const p = document.createElement('p');
      p.textContent = block;
      el.appendChild(p);
    }
  }
}

$('#prompt-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const command = input.value.trim();
  if (!command) return;
  input.value = '';
  act(command);
});

for (const btn of document.querySelectorAll('.cmd')) {
  btn.addEventListener('click', () => act(btn.textContent));
}

/* ── Map ────────────────────────────────────────────────────────────────── */

async function renderMap() {
  const res = await fetch(`/api/map?player=${encodeURIComponent(player)}`);
  if (!res.ok) return;
  const map = await res.json();
  const placed = map.locations.filter(l => l.x !== null);
  if (placed.length === 0) return;

  const CELL = 30, PAD = 14;
  const xs = placed.map(l => l.x), ys = placed.map(l => l.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const w = (Math.max(...xs) - minX) * CELL + PAD * 2;
  const h = (Math.max(...ys) - minY) * CELL + PAD * 2;
  const px = l => PAD + (l.x - minX) * CELL;
  const py = l => PAD + (l.y - minY) * CELL;
  const byId = new Map(placed.map(l => [l.id, l]));

  const svg = $('#map');
  const vw = Math.max(w, 60), vh = Math.max(h, 60);
  svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  // Cap the rendered size so a young map doesn't blow its labels up.
  svg.style.maxWidth = `${Math.min(vw * 1.6, 280)}px`;
  svg.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';

  for (const e of map.edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b) continue;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', px(a)); line.setAttribute('y1', py(a));
    line.setAttribute('x2', px(b)); line.setAttribute('y2', py(b));
    line.setAttribute('class', 'map-edge');
    svg.appendChild(line);
  }

  for (const l of placed) {
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', px(l)); dot.setAttribute('cy', py(l));
    const here = l.id === map.playerLocation;
    dot.setAttribute('r', here ? 4.5 : 3);
    dot.setAttribute('class', `map-node${l.visited ? ' visited' : ''}${here ? ' here' : ''}`);
    const title = document.createElementNS(ns, 'title');
    title.textContent = l.name;
    dot.appendChild(title);
    svg.appendChild(dot);

    if (here) {
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', px(l) + 8);
      label.setAttribute('y', py(l) - 6);
      label.setAttribute('class', 'map-label');
      label.textContent = l.name;
      svg.appendChild(label);
    }
  }

  $('#map-caption').textContent =
    `${placed.length} place${placed.length === 1 ? '' : 's'} known to the wood`;
}

/* ── Chronicle ──────────────────────────────────────────────────────────── */

let chronicleOpen = false;
$('#chronicle-toggle').addEventListener('click', async () => {
  chronicleOpen = !chronicleOpen;
  const list = $('#chronicle');
  $('#chronicle-toggle').textContent = chronicleOpen ? 'The Chronicle ▾' : 'The Chronicle ▸';
  list.hidden = !chronicleOpen;
  if (!chronicleOpen) return;

  const res = await fetch('/api/chronicle?limit=25');
  if (!res.ok) return;
  const { events } = await res.json();
  list.innerHTML = '';
  if (events.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nothing has happened. Yet.';
    list.appendChild(li);
  }
  for (const e of events) {
    const li = document.createElement('li');
    const when = document.createElement('span');
    when.className = 'when';
    when.textContent = (e.at ?? '').slice(0, 16) + ' — ';
    const what = document.createTextNode(e.description + ' ');
    const where = document.createElement('span');
    where.className = 'where';
    where.textContent = `(${e.location})`;
    li.append(when, what, where);
    list.appendChild(li);
  }
});
