import { v4 as uuidv4 } from 'uuid';

export const STARTING_LOCATION_ID = 'loc_start';

const OPPOSITE = { north: 'south', south: 'north', east: 'west', west: 'east' };

export function seedWorld(db) {
  if (!db.getById('locations', STARTING_LOCATION_ID)) {
    db.upsert('locations', STARTING_LOCATION_ID, {
      name: 'The Edge of the Great Wood',
      description:
        'You stand at the threshold of an ancient forest. Gnarled oaks stretch skyward, their branches interlaced like the fingers of old hands. A narrow path winds north into the deeper wood. Moss-covered stones mark where the path begins.',
      atmosphere: 'ancient, expectant, alive',
      connections: { north: null, south: null, east: null, west: null },
    });
  }

  // The wood is never empty: a keeper at the gate, and something to pick up.
  if (db.npcsAt(STARTING_LOCATION_ID).length === 0) {
    db.upsert('npcs', 'npc_maren', {
      name: 'Old Maren',
      personality:
        'a moss-gatherer of indeterminate age who has lived at the forest edge longer than anyone remembers; cryptic but warm, fond of riddles, terrible at finishing them; knows every rumor the wind carries',
      description: 'an old woman in a coat of stitched lichens, sorting moss into baskets',
      mood: 'amused',
      memories: [],
    }, { location_id: STARTING_LOCATION_ID });
  }

  if (db.itemsAt(STARTING_LOCATION_ID).length === 0 &&
      !db.getById('items', 'item_lantern')) {
    db.upsert('items', 'item_lantern', {
      name: 'a dented brass lantern',
      description:
        'A small brass lantern, dented as if dropped many times. It is lit, though it holds no oil and no flame anyone can point to. Scratched into the base: "RETURN TO NO ONE."',
    }, { location_id: STARTING_LOCATION_ID, holder_id: null });
  }
}

export function linkLocations(db, fromId, direction, toId) {
  const from = db.getById('locations', fromId);
  if (!from) throw new Error(`Location ${fromId} not found`);

  db.upsert('locations', fromId, {
    ...from.data,
    connections: { ...from.data.connections, [direction]: toId },
  });

  const to = db.getById('locations', toId);
  if (to) {
    db.upsert('locations', toId, {
      ...to.data,
      connections: { ...to.data.connections, [OPPOSITE[direction]]: fromId },
    });
  }
}

export async function createLocation(db, fromLocationId, direction, generateLocationFn, season, timeOfDay) {
  const from = db.getById('locations', fromLocationId);
  if (!from) throw new Error(`Source location ${fromLocationId} not found`);

  const generated = await generateLocationFn(direction, from, season, timeOfDay);
  const { npc, item, ...locationData } = generated;

  const newId = `loc_${uuidv4().slice(0, 8)}`;
  db.upsert('locations', newId, {
    ...locationData,
    connections: { north: null, south: null, east: null, west: null },
  });
  linkLocations(db, fromLocationId, direction, newId);

  if (npc?.name) {
    db.upsert('npcs', `npc_${uuidv4().slice(0, 8)}`, {
      name: npc.name,
      personality: npc.personality ?? 'enigmatic',
      description: npc.description ?? '',
      mood: npc.mood ?? 'neutral',
      memories: [],
    }, { location_id: newId });
  }

  if (item?.name) {
    db.upsert('items', `item_${uuidv4().slice(0, 8)}`, {
      name: item.name,
      description: item.description ?? '',
    }, { location_id: newId, holder_id: null });
  }

  return newId;
}
