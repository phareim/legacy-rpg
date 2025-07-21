<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Game Messages -->
    <div 
      ref="outputContainer"
      class="flex-1 overflow-y-auto px-6 py-4 space-y-4 game-output"
      @scroll="handleScroll"
    >
      <div
        v-for="message in messages"
        :key="message.id"
        :class="getMessageClass(message.type)"
        class="animate-fade-in"
      >
        <!-- Command messages -->
        <div v-if="message.type === 'command'" class="flex items-start gap-3">
          <span class="text-amber-400 font-bold text-sm mt-1">&gt;</span>
          <div class="flex-1">
            <div class="text-amber-200 font-medium">{{ message.content }}</div>
            <div class="text-xs text-stone-400 mt-1">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>

        <!-- Response messages -->
        <div v-else-if="message.type === 'response'" class="pl-6 border-l-2 border-amber-600">
          <div class="prose prose-amber max-w-none">
            <div v-html="formatGameText(message.content)" class="text-amber-100 leading-relaxed"></div>
          </div>
          <div class="text-xs text-stone-400 mt-2">{{ formatTime(message.timestamp) }}</div>
        </div>

        <!-- System messages -->
        <div v-else class="text-center">
          <div class="inline-block bg-stone-700 rounded-full px-4 py-2 text-stone-300 text-sm">
            {{ message.content }}
          </div>
          <div class="text-xs text-stone-500 mt-1">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>

      <!-- Auto-scroll indicator -->
      <div v-if="!isAtBottom && messages.length > 0" 
           class="fixed bottom-20 right-6 z-10">
        <button
          @click="scrollToBottom"
          class="bg-amber-700 hover:bg-amber-600 text-white rounded-full p-2 shadow-lg transition-colors"
          title="Scroll to bottom"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
interface GameMessage {
  id: string
  type: 'command' | 'response' | 'system'
  content: string
  timestamp: Date
}

const props = defineProps<{
  messages: GameMessage[]
  currentLocation?: any
  player?: any
}>()

const outputContainer = ref<HTMLElement>()
const isAtBottom = ref(true)

// Auto-scroll to bottom when new messages arrive
watch(() => props.messages.length, () => {
  if (isAtBottom.value) {
    nextTick(() => {
      scrollToBottom()
    })
  }
}, { immediate: true })

function handleScroll() {
  if (!outputContainer.value) return
  
  const { scrollTop, scrollHeight, clientHeight } = outputContainer.value
  isAtBottom.value = scrollTop + clientHeight >= scrollHeight - 10
}

function scrollToBottom() {
  if (!outputContainer.value) return
  
  outputContainer.value.scrollTop = outputContainer.value.scrollHeight
  isAtBottom.value = true
}

function formatTime(timestamp: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(timestamp)
}

function getMessageClass(type: GameMessage['type']): string {
  switch (type) {
    case 'command':
      return 'bg-stone-850 rounded-lg p-3 border border-stone-700'
    case 'response':
      return 'bg-stone-800 rounded-lg p-4 border border-stone-700'
    case 'system':
      return 'my-2'
    default:
      return ''
  }
}

function formatGameText(text: string): string {
  if (!text) return ''
  
  // Convert line breaks to HTML
  let formatted = text.replace(/\n/g, '<br>')
  
  // Format location references: ***location*** -> highlighted link-style text
  formatted = formatted.replace(
    /\*\*\*([^*]+)\*\*\*/g, 
    '<span class="text-blue-300 font-semibold border-b border-blue-400 border-dotted cursor-pointer hover:text-blue-200">$1</span>'
  )
  
  // Format NPCs: **character** -> highlighted character text
  formatted = formatted.replace(
    /\*\*([^*]+)\*\*/g, 
    '<span class="text-green-300 font-semibold">$1</span>'
  )
  
  // Format items: *item* -> highlighted item text
  formatted = formatted.replace(
    /\*([^*]+)\*/g, 
    '<span class="text-yellow-300 font-medium">$1</span>'
  )
  
  // Format dialogue: "text" -> stylized dialogue
  formatted = formatted.replace(
    /"([^"]+)"/g, 
    '<span class="italic text-amber-200 font-medium">"$1"</span>'
  )
  
  return formatted
}

// Expose scroll functions for parent component
defineExpose({
  scrollToBottom
})
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

/* Custom scrollbar */
.game-output::-webkit-scrollbar {
  width: 6px;
}

.game-output::-webkit-scrollbar-track {
  background: theme('colors.stone.800');
  border-radius: 3px;
}

.game-output::-webkit-scrollbar-thumb {
  background: theme('colors.stone.600');
  border-radius: 3px;
}

.game-output::-webkit-scrollbar-thumb:hover {
  background: theme('colors.stone.500');
}

/* Prose styling for game text */
.prose {
  max-width: none;
}

.prose p {
  margin-bottom: 1em;
}

.prose p:last-child {
  margin-bottom: 0;
}
</style>