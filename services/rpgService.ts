/**
 * RPG Service - Provides functions to fetch and manage RPG game data
 */

// Types
export interface RpgEntity {
  id: string;
  name: string;
  description: string;
  type: string;
  properties: Record<string, any>;
  actions: Array<{
    name: string;
    emoji: string;
    description: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Item extends RpgEntity {
  type: 'consumable' | 'weapon' | 'armor' | 'misc';
}

export interface Character extends RpgEntity {
  type: 'npc' | 'player' | 'enemy';
  properties: {
    location: string;
    inventory: string[];
    health: number;
    maxHealth: number;
    level: number;
    experience: number;
    [key: string]: any;
  };
}

export interface Place extends RpgEntity {
  type: 'location';
}

// Service
export default class RpgService {
  // Cache for loaded data
  private static itemsCache: Item[] = [];
  private static charactersCache: Character[] = [];
  private static placesCache: Place[] = [];
  private static isItemsLoaded = false;
  private static isCharactersLoaded = false;
  private static isPlacesLoaded = false;

  /**
   * Get all items
   */
  static async getItems(): Promise<Item[]> {
    if (!this.isItemsLoaded) {
      const response = await fetch('/mock/items.json');
      this.itemsCache = await response.json();
      this.isItemsLoaded = true;
    }
    return this.itemsCache;
  }

  /**
   * Get all characters
   */
  static async getCharacters(): Promise<Character[]> {
    if (!this.isCharactersLoaded) {
      const response = await fetch('/mock/characters.json');
      this.charactersCache = await response.json();
      this.isCharactersLoaded = true;
    }
    return this.charactersCache;
  }

  /**
   * Get all places
   */
  static async getPlaces(): Promise<Place[]> {
    if (!this.isPlacesLoaded) {
      const response = await fetch('/mock/places.json');
      this.placesCache = await response.json();
      this.isPlacesLoaded = true;
    }
    return this.placesCache;
  }

  /**
   * Get an item by name (case-insensitive)
   */
  static async getItemByName(name: string): Promise<Item | null> {
    const items = await this.getItems();
    return items.find(item => item.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Get a character by name (case-insensitive)
   */
  static async getCharacterByName(name: string): Promise<Character | null> {
    const characters = await this.getCharacters();
    return characters.find(character => character.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Get a place by name (case-insensitive)
   */
  static async getPlaceByName(name: string): Promise<Place | null> {
    const places = await this.getPlaces();
    return places.find(place => place.name.toLowerCase() === name.toLowerCase()) || null;
  }
} 