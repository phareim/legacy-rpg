import { createLocation } from '../world/seed.js';

export async function handleMovement(db, username, direction, ctx, ai, onChunk) {
  const player = db.getPlayer(username);
  if (!player) {
    await onChunk('You do not exist in this world yet.');
    return;
  }

  const currentLocation = db.getById('locations', player.location_id);
  const connections = currentLocation?.data?.connections ?? {};
  let targetId = connections[direction];
  let isNewGround = false;

  if (!targetId) {
    await onChunk(`You push deeper into the wood, heading ${direction}...\n\n`);
    targetId = await createLocation(
      db, player.location_id, direction,
      (dir, from) => ai.generateLocation(dir, from, ctx.season, ctx.timeOfDay, ctx.weather)
    );
    isNewGround = true;
  }

  const visited = new Set(player.data.visited ?? []);
  const firstVisit = !visited.has(targetId);
  visited.add(targetId);
  db.updatePlayer(username, targetId, { ...player.data, visited: [...visited] });

  db.insertEvent(username, targetId, 'movement', {
    direction,
    from: player.location_id,
    description: `${username} arrived from the ${oppositeDirection(direction)}`,
  });

  const newLocation = db.getById('locations', targetId);
  await ai.streamAtmosphere(newLocation, ctx, onChunk);

  const npcs = db.npcsAt(targetId);
  const items = db.itemsAt(targetId);
  if (npcs.length > 0) {
    await onChunk(`\n\nYou notice: ${npcs.map(n => n.data.name).join(', ')}.`);
  }
  if (items.length > 0) {
    await onChunk(`\nLying here: ${items.map(i => i.data.name).join(', ')}.`);
  }

  // The legacy layer: marks other wanderers have left on this place.
  if (!isNewGround) {
    const scars = db.recentEvents(targetId, 12)
      .filter(e => e.type === 'world_action' && e.player_id !== username)
      .slice(0, 2);
    for (const scar of scars) {
      await onChunk(`\n✦ ${scar.data.description}`);
    }
    if (firstVisit && scars.length === 0) {
      const visitors = db.recentEvents(targetId, 20)
        .filter(e => e.type === 'movement' && e.player_id !== username);
      if (visitors.length > 0) {
        await onChunk(`\n✦ Others have walked here before you.`);
      }
    }
  }
}

function oppositeDirection(dir) {
  return { north: 'south', south: 'north', east: 'west', west: 'east' }[dir] ?? dir;
}
