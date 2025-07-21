<template>
  <div class="bg-stone-750 px-6 py-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
      <!-- Player Info -->
      <div class="space-y-2">
        <h3 class="font-semibold text-amber-300 border-b border-stone-600 pb-1">
          🧙‍♂️ Player
        </h3>
        <div class="space-y-1">
          <div class="flex justify-between">
            <span class="text-stone-400">Name:</span>
            <span class="text-amber-100 font-medium">{{ player.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-stone-400">Level:</span>
            <span class="text-amber-100">{{ player.stats?.level || 1 }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-stone-400">Health:</span>
            <span class="text-green-300">{{ player.stats?.health || 100 }}</span>
          </div>
        </div>
      </div>

      <!-- Location Info -->
      <div class="space-y-2">
        <h3 class="font-semibold text-amber-300 border-b border-stone-600 pb-1">
          🗺️ Location
        </h3>
        <div class="space-y-1">
          <div class="flex justify-between">
            <span class="text-stone-400">Place:</span>
            <span class="text-amber-100 font-medium">{{ location.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-stone-400">Coordinates:</span>
            <span class="text-blue-300">({{ location.coordinates.x }}, {{ location.coordinates.y }})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-stone-400">World:</span>
            <span class="text-purple-300">{{ player.location.world }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="space-y-2">
        <h3 class="font-semibold text-amber-300 border-b border-stone-600 pb-1">
          📊 Status
        </h3>
        <div class="space-y-1">
          <div class="flex justify-between">
            <span class="text-stone-400">Items:</span>
            <span class="text-amber-100">{{ inventoryCount }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-stone-400">NPCs here:</span>
            <span class="text-green-300">{{ location.npcs.length }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-stone-400">Objects:</span>
            <span class="text-yellow-300">{{ location.objects.length }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Expandable sections -->
    <div class="mt-4 space-y-2">
      <!-- Inventory Toggle -->
      <details class="group">
        <summary class="cursor-pointer text-amber-300 hover:text-amber-200 font-medium flex items-center gap-2">
          <span class="group-open:rotate-90 transition-transform">▶</span>
          Inventory ({{ inventoryCount }} items)
        </summary>
        <div class="mt-2 ml-6 space-y-1">
          <div v-if="inventoryCount === 0" class="text-stone-400 italic">
            No items carried
          </div>
          <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div 
              v-for="[item, quantity] in Object.entries(player.inventory)" 
              :key="item"
              class="flex justify-between bg-stone-800 rounded px-2 py-1"
            >
              <span class="text-yellow-300">{{ item }}</span>
              <span v-if="quantity > 1" class="text-stone-400">×{{ quantity }}</span>
            </div>
          </div>
        </div>
      </details>

      <!-- Location Details Toggle -->
      <details class="group">
        <summary class="cursor-pointer text-amber-300 hover:text-amber-200 font-medium flex items-center gap-2">
          <span class="group-open:rotate-90 transition-transform">▶</span>
          Location Details
        </summary>
        <div class="mt-2 ml-6 space-y-2">
          <div v-if="location.objects.length > 0">
            <div class="text-yellow-300 font-medium">Objects:</div>
            <div class="flex flex-wrap gap-2 mt-1">
              <span 
                v-for="obj in location.objects" 
                :key="obj"
                class="bg-stone-800 text-yellow-300 px-2 py-1 rounded text-xs"
              >
                {{ obj }}
              </span>
            </div>
          </div>
          
          <div v-if="location.npcs.length > 0">
            <div class="text-green-300 font-medium">NPCs:</div>
            <div class="flex flex-wrap gap-2 mt-1">
              <span 
                v-for="npc in location.npcs" 
                :key="npc"
                class="bg-stone-800 text-green-300 px-2 py-1 rounded text-xs"
              >
                {{ npc }}
              </span>
            </div>
          </div>
        </div>
      </details>

      <!-- Recent History Toggle -->
      <details class="group" v-if="player.history && player.history.length > 0">
        <summary class="cursor-pointer text-amber-300 hover:text-amber-200 font-medium flex items-center gap-2">
          <span class="group-open:rotate-90 transition-transform">▶</span>
          Recent History
        </summary>
        <div class="mt-2 ml-6 space-y-1 max-h-32 overflow-y-auto">
          <div 
            v-for="(event, index) in player.history.slice(-5).reverse()" 
            :key="index"
            class="text-stone-300 text-xs bg-stone-800 rounded px-2 py-1"
          >
            {{ event }}
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
import type { Player, Place } from '~/types/game'

const props = defineProps<{
  player: Player
  location: Place
}>()

const inventoryCount = computed(() => {
  return Object.values(props.player.inventory).reduce((sum, quantity) => sum + quantity, 0)
})
</script>

<style scoped>
/* Custom scrollbar for history section */
details div::-webkit-scrollbar {
  width: 4px;
}

details div::-webkit-scrollbar-track {
  background: theme('colors.stone.800');
  border-radius: 2px;
}

details div::-webkit-scrollbar-thumb {
  background: theme('colors.stone.600');
  border-radius: 2px;
}
</style>