// Deterministic item interactions. Each handler returns true if it fully
// handled the input; false hands the action to the consequence engine,
// which may conjure scenery into a real item.

export async function handleTake(db, username, target, onChunk) {
  const player = db.getPlayer(username);
  if (!player) return true;

  const item = db.findByName(db.itemsAt(player.location_id), target);
  if (!item) return false;

  db.upsert('items', item.id, item.data, { location_id: null, holder_id: username });
  db.insertEvent(username, player.location_id, 'item_taken', {
    item: item.data.name,
    description: `${username} took ${item.data.name}`,
  });
  await onChunk(`You take ${item.data.name}. It is yours now — and the wood remembers.`);
  return true;
}

export async function handleDrop(db, username, target, onChunk) {
  const player = db.getPlayer(username);
  if (!player) return true;

  const item = db.findByName(db.inventory(username), target);
  if (!item) {
    await onChunk(`You carry nothing like "${target}".`);
    return true;
  }

  db.upsert('items', item.id, item.data, { location_id: player.location_id, holder_id: null });
  db.insertEvent(username, player.location_id, 'item_dropped', {
    item: item.data.name,
    description: `${username} left ${item.data.name} here`,
  });
  await onChunk(`You set ${item.data.name} down. Perhaps another wanderer will find it.`);
  return true;
}

export async function handleExamine(db, username, target, ctx, ai, onChunk) {
  const player = db.getPlayer(username);
  if (!player) return true;
  const location = db.getById('locations', player.location_id);

  const item = db.findByName(
    [...db.inventory(username), ...db.itemsAt(player.location_id)],
    target
  );
  if (item) {
    await ai.streamItemDescription(item, location, ctx, onChunk);
    return true;
  }

  const npc = db.findByName(db.npcsAt(player.location_id), target);
  if (npc) {
    await ai.streamNpcAppearance(npc, ctx, onChunk);
    return true;
  }

  // Not a known item or person — let the consequence engine decide what
  // the player's attention conjures.
  return false;
}

export async function handleInventory(db, username, onChunk) {
  const items = db.inventory(username);
  if (items.length === 0) {
    await onChunk('You carry nothing but your own footsteps.');
    return;
  }
  await onChunk('You carry:\n' + items.map(i => `  · ${i.data.name}`).join('\n'));
}
