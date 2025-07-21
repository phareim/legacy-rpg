import OpenAI from 'openai'
import type { Player, Place, NPC, GameItem, ParsedCommand, GameState } from '~/types/game'

export interface EvolutionResult {
  shouldEvolve: boolean
  evolvedEntity?: any
  evolutionNarrative?: string
}

export class AIService {
  private static openai: OpenAI | null = null

  private static getOpenAI(): OpenAI {
    if (!this.openai) {
      const config = useRuntimeConfig()
      this.openai = new OpenAI({
        apiKey: config.veniceKey || process.env.OPENAI_API_KEY
      })
    }
    return this.openai
  }

  /**
   * Generate narrative response for player actions
   */
  static async generateNarrative(
    command: ParsedCommand,
    gameState: GameState,
    actionResult: string
  ): Promise<string> {
    const openai = this.getOpenAI()
    
    const systemPrompt = `You are the storyteller for Legacy RPG, a text-based game where the world evolves permanently based on player actions.

WORLD CONTEXT:
- Player: ${gameState.player.name}
- Location: ${gameState.currentLocation.name} (${gameState.currentLocation.coordinates.x}, ${gameState.currentLocation.coordinates.y})
- Description: ${gameState.currentLocation.description}
- Objects present: ${gameState.currentLocation.objects.join(', ') || 'none'}
- NPCs present: ${gameState.currentLocation.npcs.join(', ') || 'none'}

STORYTELLING RULES:
1. Keep responses concise but evocative (2-4 sentences)
2. Use vivid, immersive language that brings the world to life
3. Maintain consistency with the established world tone
4. Reference specific details from the location and action
5. Don't repeat the basic action result - enhance it with narrative flavor
6. Use present tense, second person ("You see...", "The wind carries...")

The basic action result was: "${actionResult}"

Enhance this with rich narrative detail that makes the world feel alive and responsive.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Player performed: "${command.original}". Generate an enhanced narrative response.` 
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      })

      return response.choices[0]?.message?.content?.trim() || actionResult
    } catch (error) {
      console.error('Error generating narrative:', error)
      return actionResult // Fallback to basic result
    }
  }

  /**
   * Evaluate if any evolution triggers should activate
   */
  static async evaluateEvolutionTriggers(
    command: ParsedCommand,
    gameState: GameState,
    actionResult: string
  ): Promise<EvolutionResult[]> {
    const results: EvolutionResult[] = []
    
    // Check location evolution trigger
    if (gameState.currentLocation.evolution_trigger) {
      const locationEvolution = await this.evaluateLocationEvolution(
        command, gameState, actionResult, gameState.currentLocation
      )
      if (locationEvolution.shouldEvolve) {
        results.push(locationEvolution)
      }
    }

    // Check item evolution triggers for items in location
    for (const itemName of gameState.currentLocation.objects) {
      // TODO: Load item and check its evolution trigger
    }

    // Check NPC evolution triggers for NPCs in location
    for (const npcName of gameState.currentLocation.npcs) {
      // TODO: Load NPC and check its evolution trigger
    }

    return results
  }

  private static async evaluateLocationEvolution(
    command: ParsedCommand,
    gameState: GameState,
    actionResult: string,
    location: Place
  ): Promise<EvolutionResult> {
    const openai = this.getOpenAI()

    const systemPrompt = `You are evaluating whether a location should evolve in Legacy RPG.

LOCATION: ${location.name}
DESCRIPTION: ${location.description}
EVOLUTION TRIGGER: ${location.evolution_trigger}

CURRENT ACTION CONTEXT:
- Player: ${gameState.player.name}
- Command: ${command.original}
- Action Result: ${actionResult}
- Player History: ${gameState.player.history.slice(-3).join('; ')}

EVALUATION RULES:
1. Determine if the current action and context meet the evolution trigger conditions
2. Evolution should be meaningful and narratively significant
3. Consider the accumulation of actions, not just the current one
4. Be conservative - evolution should feel earned and impactful

Respond with JSON:
{
  "shouldEvolve": boolean,
  "reasoning": "explanation of why evolution should/shouldn't occur",
  "newName": "evolved location name (if evolving)",
  "newDescription": "evolved location description (if evolving)",
  "evolutionNarrative": "dramatic description of the transformation (if evolving)"
}`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Evaluate if this location should evolve based on the current context.' }
        ],
        max_tokens: 400,
        temperature: 0.3
      })

      const content = response.choices[0]?.message?.content?.trim()
      if (!content) return { shouldEvolve: false }

      const evaluation = JSON.parse(content)
      
      if (evaluation.shouldEvolve) {
        const evolvedLocation: Place = {
          ...location,
          name: evaluation.newName,
          description: evaluation.newDescription,
          evolution_trigger: '' // Reset trigger after evolution
        }

        return {
          shouldEvolve: true,
          evolvedEntity: evolvedLocation,
          evolutionNarrative: evaluation.evolutionNarrative
        }
      }

      return { shouldEvolve: false }
    } catch (error) {
      console.error('Error evaluating location evolution:', error)
      return { shouldEvolve: false }
    }
  }

  /**
   * Generate dynamic location descriptions based on current state
   */
  static async generateLocationDescription(
    location: Place,
    gameState: GameState
  ): Promise<string> {
    const openai = this.getOpenAI()

    const systemPrompt = `You are generating a location description for Legacy RPG.

LOCATION: ${location.name}
BASE DESCRIPTION: ${location.description}
COORDINATES: (${location.coordinates.x}, ${location.coordinates.y})

CURRENT STATE:
- Objects present: ${location.objects.join(', ') || 'none'}
- NPCs present: ${location.npcs.join(', ') || 'none'}

DESCRIPTION RULES:
1. Use the base description as a foundation but make it feel fresh and alive
2. Incorporate all objects using *item* markup (e.g., *old sword*)
3. Incorporate all NPCs using **character** markup (e.g., **village elder**)
4. Reference nearby locations using ***location*** markup when appropriate
5. Keep the tone consistent with a fantasy RPG world
6. Make it 2-3 sentences, vivid but concise
7. Use present tense, immersive language

Generate an updated description that incorporates the current objects and NPCs.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the location description.' }
        ],
        max_tokens: 200,
        temperature: 0.6
      })

      return response.choices[0]?.message?.content?.trim() || location.description
    } catch (error) {
      console.error('Error generating location description:', error)
      return location.description // Fallback to original
    }
  }

  /**
   * Create new locations when player moves to unexplored areas
   */
  static async generateNewLocation(
    world: string,
    x: number,
    y: number,
    playerHistory: string[]
  ): Promise<Place> {
    const openai = this.getOpenAI()

    const systemPrompt = `You are creating a new location for Legacy RPG at coordinates (${x}, ${y}) in world "${world}".

CONTEXT:
- Player history: ${playerHistory.slice(-5).join('; ')}
- This is unexplored territory the player has discovered

LOCATION CREATION RULES:
1. Create a name that fits the fantasy RPG setting
2. Write a 2-3 sentence description that's evocative and immersive
3. Consider the coordinates - locations should feel geographically consistent
4. Include 0-2 objects (use *object* markup) and 0-1 NPCs (use **character** markup)
5. Create a meaningful evolution trigger that could lead to interesting changes
6. Reference potential connections to other areas using ***location*** markup when appropriate

Respond with JSON:
{
  "name": "location name",
  "description": "location description with proper markup",
  "objects": ["list", "of", "object", "names"],
  "npcs": ["list", "of", "npc", "names"],
  "evolution_trigger": "description of what would cause this place to evolve"
}`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a new location at coordinates (${x}, ${y}).` }
        ],
        max_tokens: 400,
        temperature: 0.8
      })

      const content = response.choices[0]?.message?.content?.trim()
      if (!content) throw new Error('No content generated')

      const locationData = JSON.parse(content)
      
      return {
        name: locationData.name,
        description: locationData.description,
        coordinates: { x, y },
        objects: locationData.objects || [],
        npcs: locationData.npcs || [],
        evolution_trigger: locationData.evolution_trigger || ''
      }
    } catch (error) {
      console.error('Error generating new location:', error)
      // Fallback to basic generated location
      return {
        name: `unknown lands`,
        description: `You find yourself in uncharted territory. The landscape stretches before you, wild and unexplored.`,
        coordinates: { x, y },
        objects: [],
        npcs: [],
        evolution_trigger: 'When this place witnesses its first significant event'
      }
    }
  }

  /**
   * Generate conversation responses for NPCs
   */
  static async generateNPCResponse(
    npc: NPC,
    player: Player,
    conversationHistory: string[] = []
  ): Promise<string> {
    const openai = this.getOpenAI()

    const systemPrompt = `You are playing ${npc.name} in Legacy RPG.

NPC DETAILS:
- Name: ${npc.name}
- Description: ${npc.description}
- Location: ${npc.location.world} (${npc.location.x}, ${npc.location.y})
- Memory: ${npc.memory.join('; ') || 'none'}

CONVERSATION CONTEXT:
- Player: ${player.name}
- Recent conversation: ${conversationHistory.slice(-3).join(' → ') || 'first interaction'}

RESPONSE RULES:
1. Stay in character based on the NPC's description and role
2. Keep responses 1-2 sentences, conversational
3. Reference the NPC's memory if relevant
4. Be helpful but maintain personality
5. Don't break the fantasy RPG immersion

Generate a natural response as this character.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Player ${player.name} is talking to you.` }
        ],
        max_tokens: 100,
        temperature: 0.7
      })

      return response.choices[0]?.message?.content?.trim() || 
        `${npc.name} nods but seems preoccupied with other matters.`
    } catch (error) {
      console.error('Error generating NPC response:', error)
      return `${npc.name} looks at you thoughtfully but doesn't say much.`
    }
  }
}