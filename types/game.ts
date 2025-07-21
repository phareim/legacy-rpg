export interface Player {
  name: string
  location: { world: string; x: number; y: number }
  inventory: { [itemName: string]: number }
  stats: object
  active_storylines: string[]
  history: string[]
}

export interface Place {
  name: string
  description: string
  coordinates: { x: number; y: number }
  objects: string[]
  npcs: string[]
  evolution_trigger: string
}

export interface NPC {
  name: string
  description: string
  location: { world: string; x: number; y: number }
  inventory: { [itemName: string]: number }
  conversation_id: string
  memory: string[]
  evolution_trigger: string
}

export interface GameItem {
  name: string
  description: string
  type: 'common' | 'legendary'
  attributes: object
  history: string[]
  evolution_trigger: string
}

export interface Storyline {
  id: string
  name: string
  description: string
  status: 'active' | 'completed' | 'failed'
  progress: object
  evolution_trigger: string
}

export interface GameState {
  player: Player
  currentLocation: Place
}

export interface CommandResponse {
  success: boolean
  message: string
  gameState: GameState
  error?: string
}