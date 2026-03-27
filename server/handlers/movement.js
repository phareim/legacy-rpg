import { createLocation } from '../world/seed.js';

export async function handleMovement(db, username, direction, season, timeOfDay, ai, onChunk) {
  const player = db.prepare('SELECT * FROM players WHERE username = ?').get(username);
  if (!player) {
    await onChunk('You do not exist in this world yet.');
    return;
  }

  const currentLocation = db.getById('locations', player.location_id);
  const connections = currentLocation?.data?.connections ?? {};
  let targetId = connections[direction];

  if (!targetId) {
    await onChunk(`You push deeper into the wood, heading ${direction}...\n\n`);
    targetId = await createLocation(db, player.location_id, direction, ai.generateLocation, season, timeOfDay);
  }

  db.prepare('UPDATE players SET location_id = ? WHERE username = ?').run(targetId, username);
  db.insertEvent(username, targetId, 'movement', {
    direction,
    from: player.location_id,
    description: `${username} arrived from the ${oppositeDirection(direction)}`,
  });

  const newLocation = db.getById('locations', targetId);
  const npcs = db.prepare('SELECT * FROM npcs WHERE location_id = ?').all(targetId)
    .map(n => ({ ...n, data: JSON.parse(n.data) }));
  const items = db.prepare('SELECT * FROM items WHERE location_id = ?').all(targetId)
    .map(i => ({ ...i, data: JSON.parse(i.data) }));

  await ai.streamAtmosphere(newLocation, season, timeOfDay, onChunk);

  if (npcs.length > 0) {
    await onChunk(`\n\nYou notice: ${npcs.map(n => n.data.name).join(', ')}.`);
  }
  if (items.length > 0) {
    await onChunk(`\nNearby: ${items.map(i => i.data.name).join(', ')}.`);
  }
}

function oppositeDirection(dir) {
  return { north: 'south', south: 'north', east: 'west', west: 'east' }[dir] ?? dir;
}
