export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { playerName = 'player' } = query

  try {
    // TODO: Fetch actual game state from Firebase
    // For now, return a mock game state
    const gameState = {
      player: {
        name: playerName,
        location: { world: 'main', x: 0, y: 0 },
        inventory: {},
        stats: { health: 100, level: 1 },
        active_storylines: [],
        history: []
      },
      currentLocation: {
        name: 'starting meadow',
        description: 'A peaceful meadow where your journey begins. You can see a path leading ***north*** to the village.',
        coordinates: { x: 0, y: 0 },
        objects: [],
        npcs: []
      }
    }

    return {
      success: true,
      data: gameState
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve game state'
    })
  }
})