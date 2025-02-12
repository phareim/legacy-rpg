export interface Item {
  id: string
  name: string
  description: string
  type: 'weapon' | 'armor' | 'potion' | 'tool' | 'key' | 'misc'| any
  properties: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

export interface Character {
  id: string
  name: string
  description: string
  type: 'player' | 'npc' | 'merchant' | 'enemy' | any
  dialogue: {
    greeting: string
    [key: string]: string
  }
  createdAt?: Date
  updatedAt?: Date
}

export interface Place {
  coordinates: {
    north: number
    west: number
  }
  id: string
  name: string
  description: string
  type: 'location' | 'shop' | 'dungeon' | any
  connections: string[]
  createdAt?: Date
  updatedAt?: Date
}

export interface GameState {
  inventory: Item[]
  currentLocation: Place
  messages: string[]
  player: Character
} 