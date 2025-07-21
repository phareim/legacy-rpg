<template>
  <div class="bg-stone-800 px-6 py-4">
    <form @submit.prevent="submitCommand" class="flex gap-3">
      <!-- Command Prompt -->
      <div class="flex items-center text-amber-400 font-bold text-lg">
        <span>&gt;</span>
      </div>
      
      <!-- Input Field -->
      <input
        ref="commandInput"
        v-model="currentCommand"
        type="text"
        placeholder="Enter your command..."
        :disabled="loading"
        class="flex-1 bg-stone-900 border border-stone-600 rounded px-4 py-2 text-amber-100 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
        autocomplete="off"
        spellcheck="false"
      />
      
      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="loading || !currentCommand.trim()"
        class="px-6 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-700 disabled:cursor-not-allowed text-amber-100 rounded font-medium transition-colors duration-200"
      >
        <span v-if="loading" class="flex items-center gap-2">
          <LoadingSpinner class="w-4 h-4" />
          Processing...
        </span>
        <span v-else>
          Send
        </span>
      </button>
    </form>
    
    <!-- Command History Navigation -->
    <div class="mt-2 flex items-center justify-between text-xs text-stone-400">
      <div>
        <span class="hidden sm:inline">Use ↑/↓ arrow keys for command history</span>
        <span class="sm:hidden">Tap for command history</span>
      </div>
      <div v-if="commandHistory.length > 0">
        {{ currentHistoryIndex + 1 }}/{{ commandHistory.length }} commands
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits<{
  command: [command: string]
}>()

const props = defineProps<{
  loading?: boolean
}>()

// Command state
const commandInput = ref<HTMLInputElement>()
const currentCommand = ref('')
const commandHistory = ref<string[]>([])
const currentHistoryIndex = ref(-1)

// Focus input on mount
onMounted(() => {
  commandInput.value?.focus()
})

// Refocus input when not loading
watch(() => props.loading, (isLoading) => {
  if (!isLoading) {
    nextTick(() => {
      commandInput.value?.focus()
    })
  }
})

// Handle form submission
function submitCommand() {
  const command = currentCommand.value.trim()
  if (!command || props.loading) return
  
  // Add to history if it's different from the last command
  if (commandHistory.value[commandHistory.value.length - 1] !== command) {
    commandHistory.value.push(command)
    
    // Keep history to last 50 commands
    if (commandHistory.value.length > 50) {
      commandHistory.value = commandHistory.value.slice(-50)
    }
  }
  
  // Reset history navigation
  currentHistoryIndex.value = -1
  
  // Emit command
  emit('command', command)
  
  // Clear input
  currentCommand.value = ''
}

// Handle keyboard navigation
function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      navigateHistory('up')
      break
    case 'ArrowDown':
      event.preventDefault()
      navigateHistory('down')
      break
    case 'Escape':
      currentCommand.value = ''
      currentHistoryIndex.value = -1
      break
  }
}

function navigateHistory(direction: 'up' | 'down') {
  if (commandHistory.value.length === 0) return
  
  if (direction === 'up') {
    if (currentHistoryIndex.value < commandHistory.value.length - 1) {
      currentHistoryIndex.value++
      currentCommand.value = commandHistory.value[commandHistory.value.length - 1 - currentHistoryIndex.value]
    }
  } else {
    if (currentHistoryIndex.value > 0) {
      currentHistoryIndex.value--
      currentCommand.value = commandHistory.value[commandHistory.value.length - 1 - currentHistoryIndex.value]
    } else if (currentHistoryIndex.value === 0) {
      currentHistoryIndex.value = -1
      currentCommand.value = ''
    }
  }
}

// Add keyboard event listener
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Common commands for quick access (could be expanded)
const quickCommands = [
  'look',
  'north',
  'south',
  'east',
  'west',
  'inventory',
  'help'
]
</script>