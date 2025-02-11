export interface Item {
  id: string
  name: string
  description: string
  type: 'weapon' | 'armor' | 'potion' | 'tool' | 'key' | 'misc'
  properties: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

export interface Character {
  id: string
  name: string
  description: string
  type: 'npc' | 'merchant' | 'enemy'
  dialogue: {
    greeting: string
    [key: string]: string
  }
  createdAt?: Date
  updatedAt?: Date
}

export interface Place {
  id: string
  name: string
  description: string
  type: 'location' | 'shop' | 'dungeon'
  connections: string[]
  createdAt?: Date
  updatedAt?: Date
}

export interface GameState {
  coordinates: {
    north: number
    west: number
  }
  inventory: string[]
  currentLocation: string
  health: number
  messages: string[]
} 