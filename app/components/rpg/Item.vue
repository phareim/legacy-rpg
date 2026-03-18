<!-- Item.vue -->
<script setup lang="ts">
interface ItemLocation {
    coordinates: {
        north: number
        west: number
    }
    isPickedUp: boolean
}

interface ItemProperties {
    damage?: number
    defense?: number
    healing?: number
    uses?: number
    value: number
}

interface ItemProps {
    id: string
    name: string
    description: string
    type: 'weapon' | 'armor' | 'potion' | 'key' | 'treasure' | 'misc'
    properties: ItemProperties
    location: ItemLocation
    createdAt: Date
    updatedAt: Date
}

defineProps<ItemProps>()
</script>

<template>
    <div class="item">
        <div class="item-content">
            <h3>{{ name }}</h3>
            <p>{{ description }}</p>
            <div class="item-details">
                <p>Type: {{ type }}</p>
                <div v-if="properties.damage">Damage: {{ properties.damage }}</div>
                <div v-if="properties.defense">Defense: {{ properties.defense }}</div>
                <div v-if="properties.healing">Healing: {{ properties.healing }}</div>
                <div v-if="properties.uses">Uses: {{ properties.uses }}</div>
                <div>Value: {{ properties.value }}</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.item {
    padding: 1rem;
    margin: 0.5rem;
    border: 1px solid #ffd700;
    border-radius: 4px;
    background: rgba(255, 215, 0, 0.1);
}

.item-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.item-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9em;
    opacity: 0.8;
}

h3 {
    margin: 0;
    color: #ffd700;
}

p {
    margin: 0;
}
</style>
