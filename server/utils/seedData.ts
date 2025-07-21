import { FirebaseService } from './firebaseService'
import type { Place, NPC, GameItem } from '~/types/game'

export class SeedData {
  static async initializeWorld(): Promise<void> {
    console.log('Initializing world with seed data...')

    // Create starting locations
    await this.createStartingLocations()
    
    // Create initial NPCs
    await this.createInitialNPCs()
    
    // Create some basic items
    await this.createBasicItems()

    console.log('World initialization complete!')
  }

  private static async createStartingLocations(): Promise<void> {
    // Starting Meadow (0,0)
    const startingMeadow: Place = {
      name: 'peaceful meadow',
      description: 'A serene meadow filled with wildflowers and gentle breezes. A worn path leads ***north*** toward a distant village, while rolling hills stretch in other directions.',
      coordinates: { x: 0, y: 0 },
      objects: ['wildflowers'],
      npcs: [],
      evolution_trigger: 'When many travelers have passed through this place and left their mark upon it'
    }

    // Village Square (0,1)
    const villageSquare: Place = {
      name: 'village square',
      description: 'A bustling village square where merchants peddle their wares and children play. An ancient *stone well* sits at the center, and **the village elder** observes from beneath a large oak tree. Paths lead ***east*** to the market district and ***south*** back to the meadow.',
      coordinates: { x: 0, y: 1 },
      objects: ['stone well', 'oak tree'],
      npcs: ['village elder'],
      evolution_trigger: 'When a great crisis threatens the village and heroes rise to meet it'
    }

    // Market District (1,1)
    const marketDistrict: Place = {
      name: 'market district',
      description: 'Colorful stalls line cobblestone streets where traders from distant lands hawk exotic goods. A *merchant\'s scale* sits abandoned on one table, and **a traveling merchant** calls out to passersby. The village square lies ***west***, while a forest path begins to the ***north***.',
      coordinates: { x: 1, y: 1 },
      objects: ['merchant\'s scale', 'exotic goods'],
      npcs: ['traveling merchant'],
      evolution_trigger: 'When rare treasures or legendary artifacts pass through these markets'
    }

    // Forest Edge (1,2)
    const forestEdge: Place = {
      name: 'forest edge',
      description: 'The civilization of the village gives way to wild nature here. Ancient trees tower overhead, their branches whispering secrets in the wind. An *old campfire* shows signs of recent use, and **a forest ranger** tends to the woodland paths. The market district lies ***south***.',
      coordinates: { x: 1, y: 2 },
      objects: ['old campfire', 'ancient trees'],
      npcs: ['forest ranger'],
      evolution_trigger: 'When the balance between civilization and wilderness is threatened'
    }

    // Save all locations
    await FirebaseService.saveLocation('main', startingMeadow)
    await FirebaseService.saveLocation('main', villageSquare)
    await FirebaseService.saveLocation('main', marketDistrict)
    await FirebaseService.saveLocation('main', forestEdge)

    console.log('Created starting locations')
  }

  private static async createInitialNPCs(): Promise<void> {
    // Village Elder
    const villageElder: NPC = {
      name: 'village elder',
      description: 'An ancient figure with wise, weathered eyes and a long silver beard. They have watched over this village for decades and know its secrets well.',
      location: { world: 'main', x: 0, y: 1 },
      inventory: { 'ancient tome': 1 },
      conversation_id: 'village_elder_conversation',
      memory: ['Has lived in this village for over 60 years', 'Remembers when the great oak was just a sapling'],
      evolution_trigger: 'When they pass on their wisdom to a worthy successor or face a crisis that tests their leadership'
    }

    // Traveling Merchant
    const travelingMerchant: NPC = {
      name: 'traveling merchant',
      description: 'A jovial trader with a cart full of mysterious wares from distant lands. Their eyes sparkle with the excitement of commerce and adventure.',
      location: { world: 'main', x: 1, y: 1 },
      inventory: { 'silver coins': 50, 'mysterious trinket': 1 },
      conversation_id: 'traveling_merchant_conversation',
      memory: ['Arrived in town three days ago', 'Has stories from the eastern kingdoms'],
      evolution_trigger: 'When they discover a truly legendary item or witness a great adventure'
    }

    // Forest Ranger
    const forestRanger: NPC = {
      name: 'forest ranger',
      description: 'A skilled guardian of the woodland, dressed in earth-toned leather and carrying a sturdy bow. They move with the quiet confidence of one who knows every tree and trail.',
      location: { world: 'main', x: 1, y: 2 },
      inventory: { 'hunting bow': 1, 'trail rations': 5 },
      conversation_id: 'forest_ranger_conversation',
      memory: ['Has protected these woods for many years', 'Knows the location of hidden groves'],
      evolution_trigger: 'When the forest faces a great threat or when they train a successor'
    }

    await FirebaseService.saveNPC(villageElder)
    await FirebaseService.saveNPC(travelingMerchant)
    await FirebaseService.saveNPC(forestRanger)

    console.log('Created initial NPCs')
  }

  private static async createBasicItems(): Promise<void> {
    // Common items that might be found
    const wildflowers: GameItem = {
      name: 'wildflowers',
      description: 'Beautiful colorful flowers that grow naturally in the meadow. They smell sweet and remind you of peaceful times.',
      type: 'common',
      attributes: { fragrance: 'sweet', color: 'mixed' },
      history: [],
      evolution_trigger: ''
    }

    const stoneWell: GameItem = {
      name: 'stone well',
      description: 'An ancient well made of weathered stone. Clear, cool water can be drawn from its depths.',
      type: 'common',
      attributes: { material: 'stone', function: 'water source' },
      history: [],
      evolution_trigger: 'When it becomes the center of a significant event or ritual'
    }

    const merchantScale: GameItem = {
      name: 'merchant\'s scale',
      description: 'A brass scale used for weighing goods in trade. It looks reliable and well-maintained.',
      type: 'common',
      attributes: { material: 'brass', accuracy: 'high' },
      history: [],
      evolution_trigger: 'When it weighs something of legendary value'
    }

    // A potential legendary item
    const ancientTome: GameItem = {
      name: 'ancient tome',
      description: 'A leather-bound book filled with knowledge from ages past. Its pages whisper with forgotten wisdom.',
      type: 'legendary',
      attributes: { material: 'ancient leather', power: 'knowledge' },
      history: ['Created by the village\'s first elder', 'Contains the founding principles of the village'],
      evolution_trigger: 'When its wisdom is used to solve a great crisis or passed to a worthy heir'
    }

    await FirebaseService.saveItem(wildflowers)
    await FirebaseService.saveItem(stoneWell)
    await FirebaseService.saveItem(merchantScale)
    await FirebaseService.saveItem(ancientTome)

    console.log('Created basic items')
  }
}