import type { Player, Place, GameState, ParsedCommand } from '~/types/game'
import { FirebaseService } from './firebaseService'
import { AIService } from './aiService'

export interface CommandResult {
  success: boolean
  message: string
  gameState: GameState
  error?: string
}

export class WorldStateManager {
  
  static async executeCommand(command: ParsedCommand, playerName: string): Promise<CommandResult> {
    try {
      // TODO: Load actual game state from Firebase
      const currentState = await this.loadGameState(playerName)
      
      switch (command.action) {
        case 'move':
          return await this.handleMovement(command, currentState)
        case 'look':
          return await this.handleLook(currentState)
        case 'examine':
          return await this.handleExamine(command, currentState)
        case 'take':
          return await this.handleTake(command, currentState)
        case 'drop':
          return await this.handleDrop(command, currentState)
        case 'use':
          return await this.handleUse(command, currentState)
        case 'talk':
          return await this.handleTalk(command, currentState)
        case 'inventory':
          return this.handleInventory(currentState)
        case 'help':
          return this.handleHelp()
        default:
          return {
            success: false,
            message: `Unknown action: ${command.action}`,
            gameState: currentState,
            error: 'Invalid command'
          }
      }
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred while processing the command',
        gameState: await this.loadGameState(playerName),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private static async loadGameState(playerName: string): Promise<GameState> {
    // Load player from Firebase or create new one
    let player = await FirebaseService.getPlayer(playerName)
    if (!player) {
      player = await FirebaseService.createDefaultPlayer(playerName)
    }

    // Load current location
    let currentLocation = await FirebaseService.getOrCreateLocation(
      player.location.world, 
      player.location.x, 
      player.location.y
    )

    // If location was just created (basic template), enhance with AI
    if (currentLocation.description.includes('uncharted lands')) {
      currentLocation = await AIService.generateNewLocation(
        player.location.world,
        player.location.x,
        player.location.y,
        player.history
      )
      await FirebaseService.saveLocation(player.location.world, currentLocation)
    }
    
    return { player, currentLocation }
  }

  private static async loadLocation(world: string, x: number, y: number): Promise<Place> {
    return await FirebaseService.getOrCreateLocation(world, x, y)
  }

  private static async handleMovement(command: ParsedCommand, gameState: GameState): Promise<CommandResult> {
    if (!command.direction) {
      return {
        success: false,
        message: 'No direction specified',
        gameState,
        error: 'Invalid movement command'
      }
    }

    const { player } = gameState
    const newCoords = { ...player.location }

    switch (command.direction) {
      case 'north':
        newCoords.y += 1
        break
      case 'south':
        newCoords.y -= 1
        break
      case 'east':
        newCoords.x += 1
        break
      case 'west':
        newCoords.x -= 1
        break
    }

    // Load new location
    const newLocation = await this.loadLocation(newCoords.world, newCoords.x, newCoords.y)
    
    // Update player location
    const updatedPlayer = {
      ...player,
      location: newCoords
    }

    // Save updated player state to Firebase
    await FirebaseService.savePlayer(updatedPlayer)
    await FirebaseService.addToPlayerHistory(playerName, `Moved ${command.direction} to ${newLocation.name}`)

    const basicMessage = `You move ${command.direction} to ${newLocation.name}.\n\n${newLocation.description}`
    const gameState = { player: updatedPlayer, currentLocation: newLocation }

    // Generate enhanced narrative with AI
    const enhancedMessage = await AIService.generateNarrative(command, gameState, basicMessage)

    // Check for evolution triggers
    const evolutions = await AIService.evaluateEvolutionTriggers(command, gameState, basicMessage)
    let finalMessage = enhancedMessage

    // Process any evolutions
    for (const evolution of evolutions) {
      if (evolution.shouldEvolve && evolution.evolvedEntity && evolution.evolutionNarrative) {
        // Update the location in Firebase
        await FirebaseService.saveLocation(newLocation.coordinates.world || 'main', evolution.evolvedEntity)
        
        // Add evolution narrative
        finalMessage += `\n\n${evolution.evolutionNarrative}`
        
        // Update game state
        gameState.currentLocation = evolution.evolvedEntity
        
        // Record in player history
        await FirebaseService.addToPlayerHistory(playerName, `Witnessed evolution: ${evolution.evolutionNarrative}`)
      }
    }

    return {
      success: true,
      message: finalMessage,
      gameState
    }
  }

  private static async handleLook(gameState: GameState): Promise<CommandResult> {
    const { currentLocation, player } = gameState
    
    // Generate dynamic description with AI
    const enhancedDescription = await AIService.generateLocationDescription(currentLocation, gameState)
    
    return {
      success: true,
      message: `${currentLocation.name}\n\n${enhancedDescription}`,
      gameState
    }
  }

  private static async handleExamine(command: ParsedCommand, gameState: GameState): Promise<CommandResult> {
    if (!command.target) {
      return {
        success: false,
        message: 'What would you like to examine?',
        gameState,
        error: 'No target specified'
      }
    }

    const { currentLocation } = gameState
    const target = command.target.toLowerCase()

    // Check if examining the location itself
    if (target === currentLocation.name.toLowerCase() || target === 'room' || target === 'area') {
      return await this.handleLook(gameState)
    }

    // Check objects in location
    if (currentLocation.objects.some(obj => obj.toLowerCase().includes(target))) {
      return {
        success: true,
        message: `You examine the ${target}. It appears to be an ordinary ${target}.`,
        gameState
      }
    }

    // Check NPCs in location
    if (currentLocation.npcs.some(npc => npc.toLowerCase().includes(target))) {
      return {
        success: true,
        message: `You look at ${target}. They seem to be going about their business.`,
        gameState
      }
    }

    return {
      success: false,
      message: `You don't see any "${target}" here.`,
      gameState
    }
  }

  private static async handleTake(command: ParsedCommand, gameState: GameState): Promise<CommandResult> {
    if (!command.target) {
      return {
        success: false,
        message: 'What would you like to take?',
        gameState,
        error: 'No target specified'
      }
    }

    // TODO: Implement item taking logic with Firebase updates
    return {
      success: false,
      message: `You can't take the ${command.target}.`,
      gameState
    }
  }

  private static async handleDrop(command: ParsedCommand, gameState: GameState): Promise<CommandResult> {
    if (!command.target) {
      return {
        success: false,
        message: 'What would you like to drop?',
        gameState,
        error: 'No target specified'
      }
    }

    // TODO: Implement item dropping logic with Firebase updates
    return {
      success: false,
      message: `You don't have a ${command.target} to drop.`,
      gameState
    }
  }

  private static async handleUse(command: ParsedCommand, gameState: GameState): Promise<CommandResult> {
    if (!command.target) {
      return {
        success: false,
        message: 'What would you like to use?',
        gameState,
        error: 'No target specified'
      }
    }

    // TODO: Implement item usage logic
    return {
      success: false,
      message: `You don't know how to use the ${command.target}.`,
      gameState
    }
  }

  private static async handleTalk(command: ParsedCommand, gameState: GameState): Promise<CommandResult> {
    if (!command.target) {
      return {
        success: false,
        message: 'Who would you like to talk to?',
        gameState,
        error: 'No target specified'
      }
    }

    const { currentLocation, player } = gameState
    const target = command.target.toLowerCase()

    const npcName = currentLocation.npcs.find(npc => npc.toLowerCase().includes(target))
    if (!npcName) {
      return {
        success: false,
        message: `There is no "${command.target}" here to talk to.`,
        gameState
      }
    }

    // Load NPC from Firebase
    let npc = await FirebaseService.getNPC(npcName)
    if (!npc) {
      // Create basic NPC if it doesn't exist
      npc = {
        name: npcName,
        description: `A mysterious figure known as ${npcName}.`,
        location: { world: currentLocation.coordinates.world || 'main', x: currentLocation.coordinates.x, y: currentLocation.coordinates.y },
        inventory: {},
        conversation_id: `${npcName.toLowerCase().replace(/\s+/g, '_')}_conversation`,
        memory: [],
        evolution_trigger: `When they form a meaningful connection with a traveler`
      }
      await FirebaseService.saveNPC(npc)
    }

    // Generate AI response
    const response = await AIService.generateNPCResponse(npc, player, npc.memory.slice(-3))
    
    // Update NPC memory
    npc.memory.push(`Player ${player.name}: talked to me`)
    await FirebaseService.saveNPC(npc)

    // Add to player history
    await FirebaseService.addToPlayerHistory(player.name, `Talked to ${npcName}`)

    return {
      success: true,
      message: `You speak with ${npcName}.\n\n"${response}"`,
      gameState
    }
  }

  private static handleInventory(gameState: GameState): CommandResult {
    const { player } = gameState
    const items = Object.entries(player.inventory)
    
    if (items.length === 0) {
      return {
        success: true,
        message: 'Your inventory is empty.',
        gameState
      }
    }

    const itemList = items
      .map(([name, quantity]) => quantity > 1 ? `${name} (${quantity})` : name)
      .join(', ')

    return {
      success: true,
      message: `You are carrying: ${itemList}`,
      gameState
    }
  }

  private static handleHelp(): CommandResult {
    const mockState: GameState = {
      player: {
        name: 'player',
        location: { world: 'main', x: 0, y: 0 },
        inventory: {},
        stats: {},
        active_storylines: [],
        history: []
      },
      currentLocation: {
        name: 'unknown',
        description: '',
        coordinates: { x: 0, y: 0 },
        objects: [],
        npcs: [],
        evolution_trigger: ''
      }
    }

    return {
      success: true,
      message: `Available commands:
Movement: north/n, south/s, east/e, west/w, move [direction]
Interaction: look, examine [target], take [item], drop [item]
Social: talk to [character]
Items: use [item], use [item] on [target], inventory/inv
General: help/?`,
      gameState: mockState
    }
  }
}