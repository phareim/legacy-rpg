<!-- InlinePlace.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  name: string,
  active: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'click', name: string): void,
  (e: 'action', command: string): void
}>()

const place = ref<any | null>(null)
const isLoading = ref(true)
const showActions = ref(false)

// Fetch place data from Firebase
async function fetchPlace() {
  try {
    // TBD
    place.value = {
      name: props.name,
      description: 'The pond looks clean and inviting.',
      type: 'location',
      properties: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      actions: [
        {
          name: 'Examine',
          emoji: '👀',
          description: 'Examine the place'
        },
        {
          name: 'Go to',
          emoji: '🚶',
          description: 'Go to the place'
        },
        {
          name: 'Take a bath in',
          emoji: '🛁',
          description: 'Take a bath'
        },
        
      ]
    } 
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchPlace()
})

const handleClick = () => {
  if (props.active) {
    showActions.value = !showActions.value
  }
}

const handleAction = (action: string) => {
  if (!place.value) return
  emit('action', `${action} ${place.value.name}`)
}

// Get available actions based on place type
const availableActions = computed(() => {
  if (!place.value) return []
  return place.value.actions
})
</script>

<template>
  <span class="inline-place" role="button" tabindex="0">
    <span v-if="isLoading">...</span>
    <template v-else>
      <span @click="handleClick" class="place-name">{{ place?.name }}</span>
      <span v-if="showActions" class="actions">
        <button 
          v-for="action in availableActions" 
          :key="action.name"
          class="action-btn"
          :title="action.label"
          @click.stop="handleAction(action.name)"
        >
          {{ action.emoji }}
        </button>
      </span>
    </template>
  </span>
</template>

<style scoped>
.inline-place {
  color: #98fb98;
  position: relative;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.place-name {
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}

.place-name:hover {
  color: #b3fdb3;
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