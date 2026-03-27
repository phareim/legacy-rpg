import 'dotenv/config';

export function buildNpcPrompt(npc, playerInput, recentEvents, season, timeOfDay) {
  const { name, personality, memories = [], mood = 'neutral' } = npc.data;
  const recentHistory = recentEvents
    .slice(0, 10)
    .map(e => `- ${e.data.description ?? e.type}`)
    .join('\n');

  return `You are ${name}, an NPC in a magical forest RPG.
Personality: ${personality}
Current mood: ${mood}
Season: ${season}, time of day: ${timeOfDay}

Your memories of this player:
${memories.length ? memories.map(m => `- ${m}`).join('\n') : '(none yet)'}

Recent events nearby:
${recentHistory || '(nothing notable)'}

The player says: "${playerInput}"

Respond in character as ${name}. Be vivid, atmospheric, and true to your personality.
Keep your response to 2-4 sentences. Do not break character.`;
}

export function buildLocationPrompt(direction, fromLocation, season, timeOfDay) {
  const from = fromLocation.data;
  return `You are narrating a magical forest RPG.
A wanderer travels ${direction} from "${from.name}" (${from.atmosphere ?? 'mysterious'}).
Season: ${season}, time of day: ${timeOfDay}.

Generate a new forest location they arrive at. Respond with ONLY valid JSON:
{
  "name": "evocative location name",
  "description": "2-3 sentence atmospheric description",
  "atmosphere": "2-3 adjectives",
  "connections": {"north": null, "south": null, "east": null, "west": null}
}
Make it feel alive, magical, and distinct. The forest is ancient and full of wonder.`;
}

export async function streamDialogue(npc, playerInput, recentEvents, season, timeOfDay, onChunk) {
  const { VENICE_API_KEY } = process.env;
  const prompt = buildNpcPrompt(npc, playerInput, recentEvents, season, timeOfDay);

  const res = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.VENICE_MODEL ?? 'zai-org-glm-5',
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
      const t = line.trim();
      if (!t || t === 'data: [DONE]') continue;
      if (!t.startsWith('data: ')) continue;
      try {
        const chunk = JSON.parse(t.slice(6));
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) await onChunk(delta);
      } catch {}
    }
  }
}

export async function generateLocation(direction, fromLocation, season, timeOfDay) {
  const { VENICE_API_KEY } = process.env;
  const prompt = buildLocationPrompt(direction, fromLocation, season, timeOfDay);

  const res = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.VENICE_MODEL ?? 'zai-org-glm-5',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Venice error: ${res.status}`);
  const body = await res.json();
  const text = body.choices?.[0]?.message?.content ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Venice returned no JSON for location');
  return JSON.parse(match[0]);
}

export async function streamAtmosphere(location, season, timeOfDay, onChunk) {
  const { VENICE_API_KEY } = process.env;
  const { name, description, atmosphere } = location.data;
  const prompt = `You are narrating a magical forest RPG.
A wanderer arrives at "${name}".
Base description: ${description}
Atmosphere: ${atmosphere}
Season: ${season}, time of day: ${timeOfDay}.

Write a vivid 2-3 sentence arrival description. Make it feel alive and present-tense.`;

  const res = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VENICE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.VENICE_MODEL ?? 'zai-org-glm-5',
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
      const t = line.trim();
      if (!t || t === 'data: [DONE]') continue;
      if (!t.startsWith('data: ')) continue;
      try {
        const chunk = JSON.parse(t.slice(6));
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) await onChunk(delta);
      } catch {}
    }
  }
}
