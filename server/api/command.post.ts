export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { command, playerName = 'player' } = body

  if (!command || typeof command !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Command is required and must be a string'
    })
  }

  try {
    // TODO: Implement command parsing and processing
    // For now, return a basic response structure
    const response = {
      success: true,
      message: `Command "${command}" received for player "${playerName}"`,
      gameState: {
        playerName,
        location: { world: 'main', x: 0, y: 0 },
        inventory: {},
        command: command.toLowerCase().trim()
      }
    }

    return response
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process command'
    })
  }
})