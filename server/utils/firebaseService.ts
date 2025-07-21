import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import type { Player, Place, NPC, GameItem, Storyline } from '~/types/game'

export class FirebaseService {
  private static db: FirebaseFirestore.Firestore | null = null

  static initialize() {
    if (getApps().length === 0) {
      const config = useRuntimeConfig()
      
      initializeApp({
        credential: cert({
          projectId: config.firebaseProjectId,
          clientEmail: config.firebaseClientEmail,
          privateKey: config.firebasePrivateKey?.replace(/\\n/g, '\n')
        })
      })
    }
    
    this.db = getFirestore()
  }

  private static getDb() {
    if (!this.db) {
      this.initialize()
    }
    return this.db!
  }

  // Player operations
  static async getPlayer(playerName: string): Promise<Player | null> {
    try {
      const db = this.getDb()
      const doc = await db.collection('players').doc(playerName.toLowerCase()).get()
      
      if (!doc.exists) {
        return null
      }
      
      return doc.data() as Player
    } catch (error) {
      console.error('Error fetching player:', error)
      return null
    }
  }

  static async savePlayer(player: Player): Promise<boolean> {
    try {
      const db = this.getDb()
      await db.collection('players').doc(player.name.toLowerCase()).set(player)
      return true
    } catch (error) {
      console.error('Error saving player:', error)
      return false
    }
  }

  static async createDefaultPlayer(playerName: string): Promise<Player> {
    const player: Player = {
      name: playerName,
      location: { world: 'main', x: 0, y: 0 },
      inventory: {},
      stats: { health: 100, level: 1 },
      active_storylines: [],
      history: [`Player ${playerName} began their journey.`]
    }
    
    await this.savePlayer(player)
    return player
  }

  // Location operations
  static async getLocation(world: string, x: number, y: number): Promise<Place | null> {
    try {
      const db = this.getDb()
      const locationId = `${x},${y}`
      const doc = await db
        .collection('worlds')
        .doc(world)
        .collection('places')
        .doc(locationId)
        .get()
      
      if (!doc.exists) {
        return null
      }
      
      return doc.data() as Place
    } catch (error) {
      console.error('Error fetching location:', error)
      return null
    }
  }

  static async saveLocation(world: string, place: Place): Promise<boolean> {
    try {
      const db = this.getDb()
      const locationId = `${place.coordinates.x},${place.coordinates.y}`
      
      await db
        .collection('worlds')
        .doc(world)
        .collection('places')
        .doc(locationId)
        .set(place)
      
      return true
    } catch (error) {
      console.error('Error saving location:', error)
      return false
    }
  }

  static async getOrCreateLocation(world: string, x: number, y: number): Promise<Place> {
    let location = await this.getLocation(world, x, y)
    
    if (!location) {
      // Create default location
      location = {
        name: 'unexplored territory',
        description: 'You find yourself in uncharted lands. The terrain seems wild and untouched.',
        coordinates: { x, y },
        objects: [],
        npcs: [],
        evolution_trigger: 'When this place witnesses its first significant event'
      }
      
      await this.saveLocation(world, location)
    }
    
    return location
  }

  // Item operations
  static async getItem(itemName: string): Promise<GameItem | null> {
    try {
      const db = this.getDb()
      const doc = await db.collection('objects').doc(itemName.toLowerCase()).get()
      
      if (!doc.exists) {
        return null
      }
      
      return doc.data() as GameItem
    } catch (error) {
      console.error('Error fetching item:', error)
      return null
    }
  }

  static async saveItem(item: GameItem): Promise<boolean> {
    try {
      const db = this.getDb()
      await db.collection('objects').doc(item.name.toLowerCase()).set(item)
      return true
    } catch (error) {
      console.error('Error saving item:', error)
      return false
    }
  }

  // NPC operations
  static async getNPC(npcName: string): Promise<NPC | null> {
    try {
      const db = this.getDb()
      const doc = await db.collection('npcs').doc(npcName.toLowerCase()).get()
      
      if (!doc.exists) {
        return null
      }
      
      return doc.data() as NPC
    } catch (error) {
      console.error('Error fetching NPC:', error)
      return null
    }
  }

  static async saveNPC(npc: NPC): Promise<boolean> {
    try {
      const db = this.getDb()
      await db.collection('npcs').doc(npc.name.toLowerCase()).set(npc)
      return true
    } catch (error) {
      console.error('Error saving NPC:', error)
      return false
    }
  }

  // Storyline operations
  static async getStoryline(storylineId: string): Promise<Storyline | null> {
    try {
      const db = this.getDb()
      const doc = await db.collection('storylines').doc(storylineId).get()
      
      if (!doc.exists) {
        return null
      }
      
      return doc.data() as Storyline
    } catch (error) {
      console.error('Error fetching storyline:', error)
      return null
    }
  }

  static async saveStoryline(storyline: Storyline): Promise<boolean> {
    try {
      const db = this.getDb()
      await db.collection('storylines').doc(storyline.id).set(storyline)
      return true
    } catch (error) {
      console.error('Error saving storyline:', error)
      return false
    }
  }

  // Utility methods
  static async addToPlayerHistory(playerName: string, event: string): Promise<void> {
    try {
      const db = this.getDb()
      const playerRef = db.collection('players').doc(playerName.toLowerCase())
      
      await playerRef.update({
        history: getFirestore().FieldValue.arrayUnion(event)
      })
    } catch (error) {
      console.error('Error adding to player history:', error)
    }
  }

  static async updatePlayerLocation(playerName: string, world: string, x: number, y: number): Promise<void> {
    try {
      const db = this.getDb()
      await db.collection('players').doc(playerName.toLowerCase()).update({
        location: { world, x, y }
      })
    } catch (error) {
      console.error('Error updating player location:', error)
    }
  }
}