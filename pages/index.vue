<template>
	<div class="container">
		<h1>🎮 Legacy RPG Demo</h1>
		
		<div class="story-container">
			<h2>Demo Story</h2>
			
			<TextWindow 
				:text="storyText" 
				:active="true"
				@action="handleAction"
			/>
			
			<div class="command-history">
				<h3>Command History</h3>
				<div v-for="(cmd, index) in commandHistory" :key="index" class="command">
					<span class="command-text">{{ cmd }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TextWindow from '~/components/rpg/TextWindow.vue'

const storyText = ref(`You find yourself in a ***Small Village***. The cobblestone streets are lined with quaint houses, and a gentle breeze carries the scent of fresh bread. As you walk through the village, you notice **Old Man** sitting on a bench, watching passersby with curious eyes.

Near the village well, you spot a *Health Potion* glimmering in the sunlight. It seems someone left it behind.

In the distance, you can see the entrance to a ***Dark Forest***, its trees swaying ominously. The villagers say that deep within the forest lies a ***Crystal Pond*** with magical properties.

You adjust your pack, which contains an *Iron Sword* that has served you well on your travels. You wonder what adventures await in this new place.

A **Traveling Merchant** sets up his wares nearby, and you can see a **Battle-Scarred Warrior** drinking at the tavern entrance.`)

const commandHistory = ref<string[]>([])

const handleAction = (command: string) => {
	commandHistory.value.unshift(command)
}
</script>

<style scoped>
.container {
	max-width: 800px;
	margin: 0 auto;
	padding: 2rem;
	font-family: monospace;
}

h1 {
	text-align: center;
	margin-bottom: 2rem;
}

.story-container {
	display: flex;
	flex-direction: column;
	gap: 2rem;
}

.command-history {
	margin-top: 2rem;
	background-color: #1a1a1a;
	border-radius: 4px;
	padding: 1rem;
}

.command {
	padding: 0.5rem;
	border-bottom: 1px solid #333;
}

.command-text {
	color: #4ade80;
}
</style>