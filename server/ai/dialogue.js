import 'dotenv/config';

const VENICE_URL = 'https://api.venice.ai/api/v1/chat/completions';

function veniceModel() {
  return process.env.VENICE_MODEL ?? 'zai-org-glm-5';
}

function parseSseLine(line) {
  const t = line.trim();
  if (!t || t === 'data: [DONE]' || !t.startsWith('data: ')) return null;
  try {
    return JSON.parse(t.slice(6)).choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}

async function veniceStream(prompt, onChunk) {
  const res = await fetch(VENICE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: veniceModel(),
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });
  if (!res.ok) throw new Error(`Venice error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const delta = parseSseLine(line);
      if (delta) await onChunk(delta);
    }
  }
  const delta = parseSseLine(buffer);
  if (delta) await onChunk(delta);
}

export async function veniceComplete(prompt, model = veniceModel()) {
  const res = await fetch(VENICE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Venice error: ${res.status}`);
  const body = await res.json();
  return body.choices?.[0]?.message?.content ?? '';
}

const TONE = `Tone: wondrous and a little wry — think Le Guin narrated by a forest that finds humans gently funny. Never grimdark, never saccharine.`;

export function buildNpcPrompt(npc, playerInput, recentEvents, rumors, ctx) {
  const { name, personality, memories = [], mood = 'neutral' } = npc.data;
  const recentHistory = recentEvents
    .slice(0, 10)
    .map(e => `- ${e.data.description ?? e.type}`)
    .join('\n');
  const rumorLines = (rumors ?? [])
    .map(r => `- At ${r.location_name}: ${r.data.description ?? r.type}`)
    .join('\n');

  return `You are ${name}, a character in a shared magical-forest RPG.
Personality: ${personality}
Current mood: ${mood}
Season: ${ctx.season} · ${ctx.timeOfDay} · weather: ${ctx.weather}

Your memories of this player:
${memories.length ? memories.map(m => `- ${m}`).join('\n') : '(you have never met them)'}

What has happened here recently:
${recentHistory || '(nothing notable)'}

Rumors the wind has carried from elsewhere in the wood (you may allude to one if it fits):
${rumorLines || '(the wind is quiet)'}

The player says: "${playerInput}"

Respond fully in character as ${name}. ${TONE}
2-4 sentences. You may include one short action in *asterisks*. Never break character, never mention being an AI.`;
}

export function buildLocationPrompt(direction, fromLocation, ctx) {
  const from = fromLocation.data;
  return `You are the world-builder of a shared magical-forest RPG.
A wanderer travels ${direction} from "${from.name}" (${from.atmosphere ?? 'mysterious'}).
Season: ${ctx.season} · ${ctx.timeOfDay} · weather: ${ctx.weather}.

Invent the forest location they arrive at. Respond with ONLY valid JSON:
{
  "name": "evocative location name, max 5 words",
  "description": "2-3 sentence atmospheric description",
  "atmosphere": "2-3 adjectives",
  "npc": {"name": "...", "personality": "one rich sentence", "description": "what the wanderer sees", "mood": "one word"} | null,
  "item": {"name": "lowercase noun phrase with article, e.g. 'a cracked owl whistle'", "description": "1-2 sentences, ideally with one odd detail"} | null
}
About one location in three holds an inhabitant; about one in three holds a curious item. Most are empty of both — let the forest breathe. ${TONE}
Make it distinct from "${from.name}". The forest is ancient, alive, and full of small wonders.`;
}

export async function streamDialogue(npc, playerInput, recentEvents, rumors, ctx, onChunk) {
  await veniceStream(buildNpcPrompt(npc, playerInput, recentEvents, rumors, ctx), onChunk);
}

export async function generateLocation(direction, fromLocation, season, timeOfDay, weather = '') {
  const ctx = { season, timeOfDay, weather };
  const text = await veniceComplete(buildLocationPrompt(direction, fromLocation, ctx));
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Venice returned no JSON for location');
  return JSON.parse(match[0]);
}

export async function streamAtmosphere(location, ctx, onChunk) {
  const { name, description, atmosphere } = location.data;
  const prompt = `You are narrating a magical forest RPG.
A wanderer arrives at "${name}".
Base description: ${description}
Atmosphere: ${atmosphere}
Season: ${ctx.season} · ${ctx.timeOfDay} · weather: ${ctx.weather}.

Write a vivid 2-3 sentence arrival description, present tense, second person. Weave in the weather. ${TONE}`;
  await veniceStream(prompt, onChunk);
}

export async function streamItemDescription(item, location, ctx, onChunk) {
  const prompt = `You are narrating a magical forest RPG.
A wanderer closely examines ${item.data.name} at "${location.data.name}".
What is known about it: ${item.data.description || '(nothing yet)'}
Season: ${ctx.season} · ${ctx.timeOfDay}.

Write 2-3 sentences describing what they notice, present tense, second person. Reveal one small new detail consistent with what is known. ${TONE}`;
  await veniceStream(prompt, onChunk);
}

export async function streamNpcAppearance(npc, ctx, onChunk) {
  const prompt = `You are narrating a magical forest RPG.
A wanderer studies ${npc.data.name}: ${npc.data.description || npc.data.personality}.
Current mood: ${npc.data.mood ?? 'neutral'}. Season: ${ctx.season} · ${ctx.timeOfDay}.

Write 2 sentences describing them as the wanderer sees them right now, second person. ${TONE}`;
  await veniceStream(prompt, onChunk);
}
