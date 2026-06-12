export async function handleDialogue(db, username, target, input, ctx, ai, onChunk) {
  const player = db.getPlayer(username);
  if (!player) {
    await onChunk('You do not exist in this world yet.');
    return;
  }

  const npcs = db.npcsAt(player.location_id);
  if (npcs.length === 0) {
    await onChunk('You speak into the wood. Only the leaves answer.');
    return;
  }

  // No explicit target with exactly one soul present — talk to them.
  const npc = target ? db.findByName(npcs, target) : (npcs.length === 1 ? npcs[0] : null);

  if (!npc) {
    if (!target) {
      await onChunk(`Several figures are here: ${npcs.map(n => n.data.name).join(', ')}. Who do you mean?`);
    } else {
      await onChunk(`There is no one called "${target}" here.` +
        (npcs.length ? ` Present: ${npcs.map(n => n.data.name).join(', ')}.` : ''));
    }
    return;
  }

  const recentEvents = db.recentEvents(player.location_id, 10);
  const rumors = db.recentRumors(player.location_id, 4);
  await ai.streamDialogue(npc, input, recentEvents, rumors, ctx, onChunk);

  const memories = npc.data.memories ?? [];
  memories.unshift(`${username} said: "${input.slice(0, 80)}"`);
  db.upsert('npcs', npc.id, { ...npc.data, memories: memories.slice(0, 20) },
    { location_id: npc.location_id });

  db.insertEvent(username, player.location_id, 'dialogue', {
    npc: npc.data.name,
    description: `${username} spoke with ${npc.data.name}`,
  });
}
