import { CommandParser } from '~/server/utils/commandParser'
import { WorldStateManager } from '~/server/utils/worldStateManager'

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
    // Parse the command
    const parsedCommand = CommandParser.parse(command)
    
    // Execute the command
    const result = await WorldStateManager.executeCommand(parsedCommand, playerName)
    
    return result
  } catch (error) {
    if (error instanceof Error && error.message.includes('command') || error instanceof Error && error.message.includes('direction')) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message
      })
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process command'
    })
  }
})