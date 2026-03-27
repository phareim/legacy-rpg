import { v4 as uuidv4 } from 'uuid';

export async function handleWorldAction(db, username, input, season, ai, onChunk) {
  const player = db.prepare('SELECT * FROM players WHERE username = ?').get(username);
  const location = db.getById('locations', player.location_id);
  const recentEvents = db.recentEvents(player.location_id, 15);

  const consequence = await ai.reasonConsequence(
    { ...player, data: JSON.parse(player.data) },
    location,
    input,
    recentEvents,
    season
  );

  await onChunk(consequence.narrative);

  for (const change of consequence.changes ?? []) {
    applyChange(db, change, player.location_id, username);
  }
}

function applyChange(db, change, locationId, username) {
  switch (change.type) {
    case 'location_patch': {
      const loc = db.getById('locations', change.id ?? locationId);
      if (loc) db.upsert('locations', loc.id, { ...loc.data, ...change.patch });
      break;
    }
    case 'npc_patch': {
      const npc = db.getById('npcs', change.id);
      if (npc) db.upsert('npcs', npc.id, { ...npc.data, ...change.patch },
        { location_id: npc.location_id });
      break;
    }
    case 'item_move': {
      const item = db.getById('items', change.id);
      if (item) db.upsert('items', item.id, item.data,
        { location_id: change.location_id ?? null, holder_id: change.holder_id ?? null });
      break;
    }
    case 'item_create': {
      const newId = `item_${uuidv4().slice(0, 8)}`;
      db.upsert('items', newId, change.data, { location_id: change.location_id ?? locationId });
      break;
    }
    case 'event_log': {
      db.insertEvent(username, locationId, 'world_action', {
        description: change.description,
      });
      break;
    }
  }
}
