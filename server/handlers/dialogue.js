export async function handleDialogue(db, username, target, input, season, timeOfDay, ai, onChunk) {
  const player = db.prepare('SELECT * FROM players WHERE username = ?').get(username);
  if (!player) {
    await onChunk('You do not exist in this world yet.');
    return;
  }
  const npcs = db.prepare('SELECT * FROM npcs WHERE location_id = ?')
    .all(player.location_id)
    .map(n => ({ ...n, data: JSON.parse(n.data) }));

  const npc = npcs.find(n =>
    n.data.name?.toLowerCase().includes(target?.toLowerCase() ?? '')
  );

  if (!npc) {
    await onChunk(`There is no one called "${target}" here.`);
    return;
  }

  const recentEvents = db.recentEvents(player.location_id, 10);
  await ai.streamDialogue(npc, input, recentEvents, season, timeOfDay, onChunk);

  // Update NPC memory with this interaction summary
  const memories = npc.data.memories ?? [];
  memories.unshift(`${username} asked: "${input.slice(0, 60)}"`);
  db.upsert('npcs', npc.id, { ...npc.data, memories: memories.slice(0, 20) },
    { location_id: npc.location_id });

  db.insertEvent(username, player.location_id, 'dialogue', {
    npc: npc.data.name,
    description: `${username} spoke with ${npc.data.name}`,
  });
}
