<!-- InlineItem.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface Props {
  itemId: string,
  active: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'click', itemId: string): void,
  (e: 'action', command: string): void
}>()

const item = ref<any>(null)
const isLoading = ref(true)
const showActions = ref(false)

// Fetch item data from Firebase
async function fetchItem() {
  try {
    // TBD
    item.value = {
      name: "an old knife",
      description: 'A mysterious item...',
      type: 'misc',
      properties: {},
      createdAt: new Date(),
      updatedAt: new Date(),
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
        },
        {
          name: 'Equip',
          emoji: '🛡️',
          description: 'Equip the item'
        },
        {
          name: 'Unequip',
          emoji: '🔓',
          description: 'Unequip the item'
        },
        {
          name: 'Drop',
          emoji: '💦',
          description: 'Drop the item'
        },
        
      ]
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
          :key="action.command"
          class="action-btn"
          :title="action.label"
          @click.stop="handleAction(action.command)"
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