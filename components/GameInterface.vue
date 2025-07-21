<template>
  <div class="bg-stone-800 rounded-lg shadow-2xl border border-stone-700 overflow-hidden">
    <!-- Header -->
    <div class="bg-gradient-to-r from-amber-900 to-amber-800 px-6 py-4 border-b border-stone-700">
      <h1 class="text-2xl font-bold text-amber-100 flex items-center gap-3">
        <span class="text-3xl">🏰</span>
        Legacy RPG
        <span class="text-sm font-normal text-amber-200">- A World That Evolves</span>
      </h1>
    </div>

    <!-- Game Content -->
    <div class="flex flex-col h-[600px]">
      <!-- Game Output Area -->
      <GameOutput 
        :messages="gameMessages" 
        :currentLocation="gameState?.currentLocation"
        :player="gameState?.player"
        class="flex-1"
      />

      <!-- Command Input -->
      <CommandInput 
        @command="handleCommand"
        :loading="isProcessing"
        class="border-t border-stone-700"
      />
    </div>

    <!-- Player Status -->
    <PlayerStatus 
      v-if="gameState"
      :player="gameState.player"
      :location="gameState.currentLocation"
      class="border-t border-stone-700 bg-stone-750"
    />
  </div>
</template>

<script setup>
import type { GameState } from '~/types/game'

interface GameMessage {
  id: string
  type: 'command' | 'response' | 'system'
  content: string
  timestamp: Date
}

// Game state
const gameState = ref<GameState | null>(null)
const gameMessages = ref<GameMessage[]>([])
const isProcessing = ref(false)
const playerName = ref('adventurer') // Could be made configurable

// Initialize game
onMounted(async () => {
  await initializeGame()
})

async function initializeGame() {
  try {
    // Load initial game state
    const { data } = await $fetch('/api/game-state', {
      query: { playerName: playerName.value }
    })
    
    gameState.value = data
    
    // Add welcome message
    addMessage('system', 'Welcome to Legacy RPG! Your journey begins...')
    addMessage('system', `${data.currentLocation.name}\n\n${data.currentLocation.description}`)
    addMessage('system', 'Type "help" for available commands.')
  } catch (error) {
    console.error('Failed to initialize game:', error)
    addMessage('system', 'Failed to connect to the game world. Please refresh the page.')
  }
}

async function handleCommand(command: string) {
  if (!command.trim() || isProcessing.value) return
  
  isProcessing.value = true
  
  // Add command to messages
  addMessage('command', command)
  
  try {
    const result = await $fetch('/api/command', {
      method: 'POST',
      body: {
        command: command.trim(),
        playerName: playerName.value
      }
    })
    
    if (result.success) {
      // Update game state
      gameState.value = result.gameState
      
      // Add response message
      addMessage('response', result.message)
    } else {
      addMessage('response', result.error || 'Command failed')
    }
  } catch (error) {
    console.error('Command error:', error)
    addMessage('response', 'An error occurred while processing your command.')
  } finally {
    isProcessing.value = false
  }
}

function addMessage(type: GameMessage['type'], content: string) {
  gameMessages.value.push({
    id: Date.now().toString() + Math.random(),
    type,
    content,
    timestamp: new Date()
  })
  
  // Scroll to bottom after message is added
  nextTick(() => {
    const outputElement = document.querySelector('.game-output')
    if (outputElement) {
      outputElement.scrollTop = outputElement.scrollHeight
    }
  })
}
</script>