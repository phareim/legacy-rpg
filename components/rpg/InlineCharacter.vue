<!-- InlineCharacter.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useNuxtApp } from '#app'

interface Props {
  name: string,
  active: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'click', name: string): void,
  (e: 'action', command: string): void
}>()

const { $firebase } = useNuxtApp()
const character = ref<any | null>(null)
const isLoading = ref(true)
const showActions = ref(false)

// Fetch character data from Firebase
async function fetchCharacter() {
  try {
    character.value = await $firebase.getCharacterByName(props.name);
    if (!character.value) {
      // Fallback if character not found in data
      character.value = {
        name: props.name,
        description: 'A mysterious character...',
        type: 'npc',
        properties: {
          location: 'Unknown',
          inventory: [],
          health: 100,
          maxHealth: 100,
          level: 1,
          experience: 0
        },
        actions: [
          {
            name: 'Talk to',
            emoji: '💬',
            description: 'Talk to the character'        
          },
          {
            name: 'Examine',
            emoji: '👀',
            description: 'Examine the character'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchCharacter()
})

const handleClick = () => {
  if (props.active) {
    showActions.value = !showActions.value
  }
}

const handleAction = (action: string) => {
  if (!character.value) return
  emit('action', `${action} ${character.value.name}`)
}

// Get available actions based on character type
const availableActions = computed(() => {
  if (!character.value) return []
  return character.value.actions
})
</script>

<template>
  <span class="inline-character" role="button" tabindex="0">
    <span v-if="isLoading">...</span>
    <template v-else>
      <span @click="handleClick" class="character-name">{{ character?.name }}</span>
      <span v-if="showActions" class="actions">
        <button 
          v-for="action in availableActions" 
          :key="action.name"
          class="action-btn"
          :title="action.description"
          @click.stop="handleAction(action.name)"
        >
          {{ action.emoji }}
        </button>
      </span>
    </template>
  </span>
</template>

<style scoped>
.inline-character {
  color: #ff69b4;
  position: relative;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.character-name {
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}

.character-name:hover {
  color: #ff9dc9;
  font-weight: bold;
}

.actions {
  display: inline-flex;
  gap: 0.25rem;
  margin-left: 0.25rem;
}

.action-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.8;
  transition: transform 0.1s, opacity 0.1s;
}

.action-btn:hover {
  opacity: 1;
  transform: scale(1.2);
}
</style> 