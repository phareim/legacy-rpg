export const mockItems = {
  'rusty-sword': {
    id: 'rusty-sword',
    name: 'Rusty Sword',
    description: 'An old sword with rust spots. Still sharp enough.',
    type: 'weapon',
    properties: {
      damage: 5,
      durability: 80
    }
  },
  'health-potion': {
    id: 'health-potion',
    name: 'Health Potion',
    description: 'A red bubbling liquid that restores health.',
    type: 'potion',
    properties: {
      healing: 20
    }
  },
  'brass-key': {
    id: 'brass-key',
    name: 'Brass Key',
    description: 'An ornate brass key. Must open something important.',
    type: 'key',
    properties: {
      opens: 'old-chest'
    }
  }
}

export const mockCharacters = {
  'old-merchant': {
    id: 'old-merchant',
    name: 'Old Merchant',
    description: 'A weathered trader with mysterious goods.',
    type: 'merchant',
    dialogue: {
      greeting: 'Welcome, traveler! Care to see my wares?'
    }
  },
  'village-guard': {
    id: 'village-guard',
    name: 'Village Guard',
    description: 'A stern-looking guard keeping watch.',
    type: 'npc',
    dialogue: {
      greeting: 'Move along, stranger. And no trouble!'
    }
  }
}

export const mockPlaces = {
  'forest-clearing': {
    id: 'forest-clearing',
    name: 'Forest Clearing',
    description: 'A peaceful clearing surrounded by ancient trees.',
    type: 'location',
    connections: ['village-gate', 'dark-cave']
  },
  'village-gate': {
    id: 'village-gate',
    name: 'Village Gate',
    description: 'The sturdy wooden gates of the village.',
    type: 'location',
    connections: ['forest-clearing', 'market-square']
  },
  'market-square': {
    id: 'market-square',
    name: 'Market Square',
    description: 'A bustling marketplace full of traders.',
    type: 'shop',
    connections: ['village-gate']
  }
}

export const mockGameState = {
  'default': {
    coordinates: {
      north: 0,
      west: 0
    },
    inventory: ['rusty-sword'],
    currentLocation: 'forest-clearing',
    health: 100,
    messages: [
      'You find yourself at the edge of a mysterious forest. The air is thick with ancient magic.',
      'What would you like to do?'
    ]
  }
} 