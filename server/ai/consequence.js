import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';
import { veniceComplete } from './dialogue.js';

export function buildConsequencePrompt(world) {
  const { player, location, action, recentEvents, npcs, items, inventory, ctx } = world;

  const recentHistory = recentEvents
    .slice(0, 15)
    .map(e => `[${e.created_at}] ${e.data.description ?? e.type}`)
    .join('\n');
  const npcLines = npcs.map(n => `- id=${n.id} "${n.data.name}" (mood: ${n.data.mood ?? 'neutral'})`).join('\n');
  const itemLines = items.map(i => `- id=${i.id} ${i.data.name}`).join('\n');
  const invLines = inventory.map(i => `- id=${i.id} ${i.data.name}`).join('\n');

  return `You are the world-engine of "The Great Wood" — a shared, persistent magical-forest RPG where every action leaves a permanent mark that other players will find later.

Player: ${player.username} (player id: "${player.id}")
Location: ${location.data.name} (id: "${location.id}")${location.data.description ? ` — ${location.data.description}` : ''}
Season: ${ctx.season} · ${ctx.timeOfDay} · weather: ${ctx.weather}

Characters present:
${npcLines || '(no one)'}

Items lying here:
${itemLines || '(nothing)'}

The player carries:
${invLines || '(nothing)'}

Recent events at this location:
${recentHistory || '(none)'}

The player attempts: "${action}"

Decide what actually happens. Honor physics-of-magic: bold actions succeed in surprising ways, foolish actions backfire entertainingly, impossible actions fail with style. The tone is wondrous and a little wry — the forest finds humans gently funny. The change should be FELT by the next player who passes through.

Respond with ONLY valid JSON:
{
  "narrative": "2-4 sentences, present tense, second person, vivid and consequential",
  "changes": [
    {"type": "location_patch", "id": "location id", "patch": {"description": "...", "atmosphere": "..."}},
    {"type": "npc_create", "data": {"name": "...", "personality": "...", "description": "...", "mood": "..."}},
    {"type": "npc_patch", "id": "npc id from the list above", "patch": {"mood": "...", "description": "..."}},
    {"type": "npc_remove", "id": "npc id", "reason": "left / transformed / etc"},
    {"type": "item_create", "data": {"name": "lowercase noun phrase with article", "description": "..."}, "holder": "ground"|"player"},
    {"type": "item_move", "id": "item id from the lists above", "to": "ground"|"player"|"gone"},
    {"type": "event_log", "description": "one-line past-tense summary for the world chronicle, mentioning ${player.username} by name"}
  ]
}

Rules:
- Use ONLY ids listed above. Do not invent ids.
- 1-4 changes. ALWAYS include exactly one event_log — it is the world's permanent memory.
- If the player tries to take/affect something that plausibly exists in the scenery but is not an item yet, you may item_create it.
- Never patch "connections" or "name" on a location.
- Create an NPC only when the story genuinely summons one.`;
}

const VALID_CHANGE_TYPES = new Set([
  'location_patch', 'npc_create', 'npc_patch', 'npc_remove',
  'item_create', 'item_move', 'event_log',
]);

// Defensive pass over model output before it touches the database.
export function sanitizeConsequence(raw) {
  const narrative = typeof raw?.narrative === 'string' && raw.narrative.trim()
    ? raw.narrative.trim()
    : 'The forest considers your action... and keeps its own counsel.';

  const changes = (Array.isArray(raw?.changes) ? raw.changes : [])
    .filter(c => c && VALID_CHANGE_TYPES.has(c.type))
    .slice(0, 6)
    .map(c => {
      if (c.type === 'location_patch' && c.patch) {
        // The movement system owns the map graph and location identity.
        const { connections, name, id, ...patch } = c.patch;
        return { ...c, patch };
      }
      return c;
    });

  return { narrative, changes };
}

function parseConsequence(text, source) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`${source} returned no JSON for consequence`);
  return sanitizeConsequence(JSON.parse(match[0]));
}

// World-actions are the heaviest reasoning task, so the Venice understudy
// uses a heftier model than the streaming dialogue/atmosphere calls.
function worldModel() {
  return process.env.VENICE_WORLD_MODEL ?? 'deepseek-v4-pro';
}

// Claude is the preferred world-engine; Venice is the understudy so the
// world keeps turning when the Anthropic key is missing or out of credits.
export async function reasonConsequence(world) {
  const prompt = buildConsequencePrompt(world);

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      return parseConsequence(message.content[0].text, 'Claude');
    } catch (err) {
      console.warn(`Consequence engine: Claude unavailable (${err.message?.slice(0, 120)}); falling back to Venice (${worldModel()})`);
    }
  }

  return parseConsequence(await veniceComplete(prompt, worldModel()), 'Venice');
}
