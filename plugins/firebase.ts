import { defineNuxtPlugin } from '#app'
import RpgService from '~/services/rpgService'

/**
 * Mock Firebase plugin
 * 
 * This plugin provides a mock Firebase implementation using local JSON data
 * for development and testing purposes.
 */
export default defineNuxtPlugin(nuxtApp => {
  const mockFirebase = {
    // RPG data methods
    async getItemByName(name: string) {
      return await RpgService.getItemByName(name);
    },
    
    async getCharacterByName(name: string) {
      return await RpgService.getCharacterByName(name);
    },
    
    async getPlaceByName(name: string) {
      return await RpgService.getPlaceByName(name);
    },
    
    async getAllItems() {
      return await RpgService.getItems();
    },
    
    async getAllCharacters() {
      return await RpgService.getCharacters();
    },
    
    async getAllPlaces() {
      return await RpgService.getPlaces();
    }
  }

  return {
    provide: {
      firebase: mockFirebase
    }
  }
}) 