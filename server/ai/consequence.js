import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

export function buildConsequencePrompt(player, location, action, recentEvents, season) {
  const recentHistory = recentEvents
    .slice(0, 15)
    .map(e => `[${e.created_at}] ${e.data.description ?? e.type}`)
    .join('\n');

  return `You are the world-engine of a magical forest RPG. A player has taken an action that may permanently change the world.

Player: ${player.username}
Location: ${location.data.name} — ${location.data.description}
Season: ${season}
Action: "${action}"

Recent events at this location:
${recentHistory || '(none)'}

Decide what actually happens and what permanently changes. Respond with ONLY valid JSON:
{
  "narrative": "2-3 sentence description of what happens, vivid and consequential",
  "changes": [
    // Include only changes that actually apply. Types:
    // {"type": "location_patch", "id": "${location.id}", "patch": {key: value, ...}}
    // {"type": "npc_patch", "id": "npc_id", "patch": {key: value, ...}}
    // {"type": "item_move", "id": "item_id", "location_id": "loc_id", "holder_id": null}
    // {"type": "item_create", "location_id": "loc_id", "data": {name, description, ...}}
    // {"type": "event_log", "description": "one-line summary of what happened"}
  ]
}

The world is magical and alive. Actions have real, lasting consequences. Be creative but coherent.`;
}

export async function reasonConsequence(player, location, action, recentEvents, season) {
  const client = new Anthropic();
  const prompt = buildConsequencePrompt(player, location, action, recentEvents, season);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Claude returned no JSON for consequence');
  return JSON.parse(match[0]);
}
