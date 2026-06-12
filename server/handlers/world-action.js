import { v4 as uuidv4 } from 'uuid';

export async function handleWorldAction(db, username, input, ctx, ai, onChunk) {
  const player = db.getPlayer(username);
  if (!player) {
    await onChunk('You do not exist in this world yet.');
    return;
  }

  const location = db.getById('locations', player.location_id);
  const world = {
    player,
    location,
    action: input,
    recentEvents: db.recentEvents(player.location_id, 15),
    npcs: db.npcsAt(player.location_id),
    items: db.itemsAt(player.location_id),
    inventory: db.inventory(username),
    ctx,
  };

  const consequence = await ai.reasonConsequence(world);
  await onChunk(consequence.narrative);

  let logged = false;
  for (const change of consequence.changes ?? []) {
    if (applyChange(db, change, player.location_id, username)) logged = true;
  }
  // The chronicle must never miss a world-altering act.
  if (!logged) {
    db.insertEvent(username, player.location_id, 'world_action', {
      description: `${username}: "${input.slice(0, 80)}"`,
    });
  }
}

// Returns true when the change wrote an event_log entry.
function applyChange(db, change, locationId, username) {
  switch (change.type) {
    case 'location_patch': {
      const loc = db.getById('locations', change.id ?? locationId);
      // Consequences may only reshape the place the player stands in.
      if (loc && loc.id === locationId) {
        const { connections, name, id, ...patch } = change.patch ?? {};
        db.upsert('locations', loc.id, { ...loc.data, ...patch });
      }
      break;
    }
    case 'npc_create': {
      if (!change.data?.name) break;
      db.upsert('npcs', `npc_${uuidv4().slice(0, 8)}`, {
        name: change.data.name,
        personality: change.data.personality ?? 'enigmatic',
        description: change.data.description ?? '',
        mood: change.data.mood ?? 'neutral',
        memories: [],
      }, { location_id: locationId });
      break;
    }
    case 'npc_patch': {
      const npc = db.getById('npcs', change.id);
      if (npc && npc.location_id === locationId) {
        const { id, ...patch } = change.patch ?? {};
        db.upsert('npcs', npc.id, { ...npc.data, ...patch }, { location_id: npc.location_id });
      }
      break;
    }
    case 'npc_remove': {
      const npc = db.getById('npcs', change.id);
      if (npc && npc.location_id === locationId) db.deleteById('npcs', npc.id);
      break;
    }
    case 'item_create': {
      if (!change.data?.name) break;
      const holder = change.holder === 'player' ? username : null;
      db.upsert('items', `item_${uuidv4().slice(0, 8)}`, {
        name: change.data.name,
        description: change.data.description ?? '',
      }, { location_id: holder ? null : locationId, holder_id: holder });
      break;
    }
    case 'item_move': {
      const item = db.getById('items', change.id);
      if (!item) break;
      // Only items in reach: lying here or carried by this player.
      const inReach = item.location_id === locationId || item.holder_id === username;
      if (!inReach) break;
      if (change.to === 'gone') {
        db.deleteById('items', item.id);
      } else if (change.to === 'player') {
        db.upsert('items', item.id, item.data, { location_id: null, holder_id: username });
      } else {
        db.upsert('items', item.id, item.data, { location_id: locationId, holder_id: null });
      }
      break;
    }
    case 'event_log': {
      if (!change.description) break;
      db.insertEvent(username, locationId, 'world_action', {
        description: String(change.description).slice(0, 240),
      });
      return true;
    }
  }
  return false;
}
