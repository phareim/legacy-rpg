import { v4 as uuidv4 } from 'uuid';

export const STARTING_LOCATION_ID = 'loc_start';

export function seedWorld(db) {
  const existing = db.getById('locations', STARTING_LOCATION_ID);
  if (existing) return;

  db.upsert('locations', STARTING_LOCATION_ID, {
    name: 'The Edge of the Great Wood',
    description:
      'You stand at the threshold of an ancient forest. Gnarled oaks stretch skyward, their branches interlaced like the fingers of old hands. A narrow path winds north into the deeper wood. Moss-covered stones mark where the path begins.',
    atmosphere: 'ancient, expectant, alive',
    connections: { north: null, south: null, east: null, west: null },
    seasonal: {},
  });
}

export function linkLocations(db, fromId, direction, toId) {
  const from = db.getById('locations', fromId);
  if (!from) throw new Error(`Location ${fromId} not found`);

  const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' };
  const connections = { ...from.data.connections, [direction]: toId };
  db.upsert('locations', fromId, { ...from.data, connections });

  const to = db.getById('locations', toId);
  if (to) {
    const toConnections = { ...to.data.connections, [opposite[direction]]: fromId };
    db.upsert('locations', toId, { ...to.data, connections: toConnections });
  }
}

export async function createLocation(db, fromLocationId, direction, generateLocationFn, season, timeOfDay) {
  const from = db.getById('locations', fromLocationId);
  if (!from) throw new Error(`Source location ${fromLocationId} not found`);

  const newId = `loc_${uuidv4().slice(0, 8)}`;
  const locationData = await generateLocationFn(direction, from, season, timeOfDay);

  db.upsert('locations', newId, {
    ...locationData,
    connections: { north: null, south: null, east: null, west: null },
  });

  linkLocations(db, fromLocationId, direction, newId);
  return newId;
}
