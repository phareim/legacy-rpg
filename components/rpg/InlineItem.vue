<!-- InlineItem.vue -->
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
const item = ref<any>(null)
const isLoading = ref(true)
const showActions = ref(false)

// Fetch item data from Firebase
async function fetchItem() {
  try {
    item.value = await $firebase.getItemByName(props.name);
    if (!item.value) {
      // Fallback if item not found in data
      item.value = {
        name: props.name,
        description: 'A mysterious item...',
        type: 'misc',
        properties: {},
        actions: [
          {
            name: 'Take',
            emoji: '🤚',
            description: 'Take the item'
          }, 
          {
            name: 'Examine',
            emoji: '👀',
            description: 'Examine the item'
          },
          {
            name: 'Use',
            emoji: '🔧',
            description: 'Use the item'
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
  fetchItem()
})

const handleClick = () => {
  if (props.active) {
    showActions.value = !showActions.value
  }
}

const handleAction = (action: string) => {
  if (!item.value) return
  emit('action', `${action} ${item.value.name}`)
}

// Get available actions based on item type
const availableActions = computed(() => {
  if (!item.value) return []
  return item.value.actions
})
</script>

<template>
  <span class="inline-item" role="button" tabindex="0">
    <span v-if="isLoading">...</span>
    <template v-else>
      <span @click="handleClick" class="item-name">{{ item?.name }}</span>
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
.inline-item {
  color: #ffd700;
  position: relative;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.item-name {
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}

.item-name:hover {
  color: #ffed4a;
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