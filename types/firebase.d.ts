import { Item, Character, Place } from '~/services/rpgService'

declare module '#app' {
  interface NuxtApp {
    $firebase: {
      getItemByName(name: string): Promise<Item | null>;
      getCharacterByName(name: string): Promise<Character | null>;
      getPlaceByName(name: string): Promise<Place | null>;
      getAllItems(): Promise<Item[]>;
      getAllCharacters(): Promise<Character[]>;
      getAllPlaces(): Promise<Place[]>;
    }
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $firebase: {
      getItemByName(name: string): Promise<Item | null>;
      getCharacterByName(name: string): Promise<Character | null>;
      getPlaceByName(name: string): Promise<Place | null>;
      getAllItems(): Promise<Item[]>;
      getAllCharacters(): Promise<Character[]>;
      getAllPlaces(): Promise<Place[]>;
    }
  }
}

export {} 