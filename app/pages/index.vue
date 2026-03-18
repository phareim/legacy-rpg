<template>
	<div class="game-container">
		<!-- Player location display -->
		<div class="player-location">
			<div class="location-label">Player Location:</div>
			<div class="place-name">{{ playerPlaceName }}</div>
			<div class="coordinates">{{ playerCoordinates }}</div>
		</div>
		<div class="game-output" ref="outputBox">
			<template v-for="(message, index) in gameMessages" :key="index">
				<div v-if="message.startsWith('>')" class="message command">
					{{ message }}
				</div>
				<TextWindow
					v-else
					:text="message"
					:active="!isLoading"
					@action="handleAction"
					@characterClick="handleCharacterClick"
					@placeClick="handlePlaceClick"
					class="message"
				/>
			</template>
			<div v-if="isLoading" class="message loading">...</div>
		</div>
		<div class="command-buttons">
			<button
				v-for="cmd in ['↑', '↓', '→', '←', '👀', '🎒']"
				:key="cmd"
				@click="executeCommand(cmd)"
				class="command-button"
				:disabled="isLoading"
			>
				{{ cmd }}
			</button>
			<div class="dropdown">
				<button class="command-button dropdown-toggle" :disabled="isLoading">...</button>
				<div class="dropdown-content">
					<button @click="executeCommand('help')" class="dropdown-item" :disabled="isLoading">?</button>
					<button @click="resetGame" class="dropdown-item" :disabled="isLoading">Reset Game</button>
				</div>
			</div>
		</div>
		<div class="input-container">
			<input
				type="text"
				v-model="userInput"
				@keyup.enter="handleCommand"
				placeholder="Enter your command..."
				ref="inputField"
				autocomplete="off"
				:disabled="isLoading"
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import TextWindow from '~/components/rpg/TextWindow.vue'
import { APIClient } from '~/utils/api-client'

const UI_STATE_KEY = 'rpg_ui_state'
const INITIAL_MESSAGES = [
	'You find yourself in the middle of a mysterious forest. The air is thick with ancient magic.',
	'What would you like to do?'
]

const userInput = ref('')
const gameMessages = ref<string[]>([...INITIAL_MESSAGES])
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)
const isLoading = ref(false)
const userId = ref('')
const inputField = ref<HTMLInputElement>()
const outputBox = ref<HTMLElement>()
const playerCoordinates = ref('N: 0, W: 0')
const playerPlaceName = ref('Unknown location')

// Load UI state from localStorage
function loadUIState() {
	try {
		const stored = localStorage.getItem(UI_STATE_KEY)
		if (stored) {
			const state = JSON.parse(stored)
			if (state.uiMessages?.length) gameMessages.value = state.uiMessages
			if (state.commandHistory) {
				commandHistory.value = state.commandHistory
				historyIndex.value = commandHistory.value.length
			}
			if (state.lastNorth !== undefined && state.lastWest !== undefined) {
				playerCoordinates.value = `N: ${state.lastNorth}, W: ${state.lastWest}`
			}
			if (state.lastPlaceName) playerPlaceName.value = state.lastPlaceName
		}
	} catch (error) {
		console.error('Error loading UI state:', error)
	}
}

// Save UI state to localStorage
function saveUIState() {
	try {
		const coordMatch = playerCoordinates.value.match(/N:\s*(-?\d+),\s*W:\s*(-?\d+)/)
		const state = {
			uiMessages: gameMessages.value,
			commandHistory: commandHistory.value,
			lastNorth: coordMatch ? parseInt(coordMatch[1]) : 0,
			lastWest: coordMatch ? parseInt(coordMatch[2]) : 0,
			lastPlaceName: playerPlaceName.value
		}
		localStorage.setItem(UI_STATE_KEY, JSON.stringify(state))
	} catch (error) {
		console.error('Error saving UI state:', error)
	}
}

async function resetGame() {
	if (confirm('Are you sure you want to reset the game? This will clear all progress.')) {
		try {
			await fetch('/api/rpg', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: userId.value })
			})

			localStorage.removeItem(UI_STATE_KEY)
			gameMessages.value = [...INITIAL_MESSAGES]
			commandHistory.value = []
			historyIndex.value = -1
			userInput.value = ''
			playerCoordinates.value = 'N: 0, W: 0'
			playerPlaceName.value = 'Unknown location'

			inputField.value?.focus()
		} catch (error) {
			console.error('Error resetting game:', error)
			addMessage('Error resetting game. Please try again.')
		}
	}
}

// Command handling
async function handleCommand() {
	if (!userInput.value.trim() || isLoading.value) return

	isLoading.value = true

	commandHistory.value.push(userInput.value)
	historyIndex.value = commandHistory.value.length

	addMessage(`> ${userInput.value}`)

	try {
		const data = await APIClient.processCommand(userInput.value, userId.value)

		if ('error' in data) {
			addMessage(data.error)
		} else {
			addMessage(data.response)
			const gs = data.gameState
			if (gs?.coordinates) {
				playerCoordinates.value = `N: ${gs.coordinates.north}, W: ${gs.coordinates.west}`
			}
			if (gs?.currentPlace?.name) {
				playerPlaceName.value = gs.currentPlace.name
			}
		}

		saveUIState()
	} catch (error) {
		console.error('Error processing command:', error)
		addMessage('The magical connection seems to be disturbed. Your command may not have been processed.')
	} finally {
		userInput.value = ''
		isLoading.value = false
		nextTick(() => {
			scrollToBottom()
			inputField.value?.focus()
		})
	}
}

function addMessage(message: string) {
	gameMessages.value.push(message)
}

function scrollToBottom() {
	if (outputBox.value) {
		outputBox.value.scrollTop = outputBox.value.scrollHeight
	}
}

// Keyboard navigation
function handleKeyDown(event: KeyboardEvent) {
	if (event.key === 'ArrowUp') {
		event.preventDefault()
		if (historyIndex.value > 0) {
			historyIndex.value--
			userInput.value = commandHistory.value[historyIndex.value]
		}
	} else if (event.key === 'ArrowDown') {
		event.preventDefault()
		if (historyIndex.value < commandHistory.value.length - 1) {
			historyIndex.value++
			userInput.value = commandHistory.value[historyIndex.value]
		} else {
			historyIndex.value = commandHistory.value.length
			userInput.value = ''
		}
	}
}

// Command shortcuts
function executeCommand(cmd: string) {
	const commandMap: Record<string, string> = {
		'↑': 'go north',
		'↓': 'go south',
		'→': 'go east',
		'←': 'go west',
		'👀': 'look',
		'🎒': 'inventory',
		'?': 'help'
	}
	userInput.value = commandMap[cmd] || cmd
	handleCommand()
}

// Item interaction handlers
function handleAction(command: string) {
	if (isLoading.value) return
	userInput.value = command
	handleCommand()
}

function handleCharacterClick(name: string) {
	if (isLoading.value) return
	userInput.value = `talk to ${name}`
	handleCommand()
}

function handlePlaceClick(name: string) {
	if (isLoading.value) return
	userInput.value = `go to ${name}`
	handleCommand()
}

let isMounted = false

onMounted(() => {
	isMounted = true

	userId.value = localStorage.getItem('rpg_user_id') ||
		Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
	localStorage.setItem('rpg_user_id', userId.value)

	loadUIState()

	nextTick(() => {
		if (isMounted) {
			scrollToBottom()
			inputField.value?.focus()
		}
	})

	if (isMounted) {
		document.addEventListener('keydown', handleKeyDown)
	}
})

onBeforeUnmount(() => {
	isMounted = false
	document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

.game-container {
	width: 100vw;
	height: 100vh;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 20px;
	box-sizing: border-box;
	background: linear-gradient(180deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%);
	color: #f9fafb;
	font-family: 'Press Start 2P', 'Courier New', monospace;
}

.game-output {
	width: 80%;
	max-width: 800px;
	height: 70vh;
	background: linear-gradient(145deg, #1f2937 0%, #111827 100%);
	border: 4px solid #f3f4f6;
	padding: 20px;
	margin-bottom: 20px;
	overflow-y: auto;
	box-shadow:
		0 0 0 2px #1f2937,
		0 8px 16px rgba(0, 0, 0, 0.6),
		inset 0 2px 4px rgba(255, 255, 255, 0.2);
	position: relative;
}

.game-output::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background:
		repeating-linear-gradient(
			0deg,
			transparent,
			transparent 15px,
			rgba(156, 163, 175, 0.05) 16px
		);
	pointer-events: none;
}

.message {
	margin: 5px 0;
	line-height: 1.6;
	font-size: 11px;
	letter-spacing: 1px;
	position: relative;
	z-index: 1;
}

.command {
	color: #888;
	font-style: italic;
}

.loading {
	opacity: 0.7;
	animation: blink 1s infinite;
}

@keyframes blink {
	0% { opacity: 0.3; }
	50% { opacity: 0.7; }
	100% { opacity: 0.3; }
}

.input-container {
	width: 80%;
	max-width: 800px;
	display: flex;
	gap: 10px;
}

input {
	flex: 1;
	padding: 12px 16px;
	background: linear-gradient(145deg, #4b5563 0%, #374151 100%);
	border: 3px solid #f3f4f6;
	color: #f9fafb;
	font-family: 'Press Start 2P', 'Courier New', monospace;
	font-size: 10px;
	outline: none;
	box-shadow:
		inset 0 2px 4px rgba(0, 0, 0, 0.3),
		0 2px 4px rgba(0, 0, 0, 0.2);
	caret-color: #fbbf24;
	letter-spacing: 1px;
}

input:focus {
	border-color: #fbbf24;
	box-shadow:
		inset 0 2px 4px rgba(0, 0, 0, 0.3),
		0 0 8px rgba(251, 191, 36, 0.5);
}

input::placeholder {
	color: #9ca3af;
	opacity: 0.7;
}

.command-buttons {
	width: 80%;
	max-width: 800px;
	display: flex;
	gap: 8px;
	margin-bottom: 10px;
	flex-wrap: wrap;
}

.command-button {
	padding: 8px 12px;
	background: linear-gradient(145deg, #dc2626 0%, #b91c1c 100%);
	border: 2px solid #fef2f2;
	color: #fff;
	font-family: 'Press Start 2P', 'Courier New', monospace;
	font-size: 8px;
	cursor: pointer;
	transition: all 0.1s ease;
	text-transform: uppercase;
	box-shadow:
		0 4px 0px #7f1d1d,
		0 6px 8px rgba(0, 0, 0, 0.3);
	letter-spacing: 0.5px;
}

.command-button:hover:not(:disabled) {
	background: linear-gradient(145deg, #ef4444 0%, #dc2626 100%);
	transform: translateY(1px);
	box-shadow:
		0 3px 0px #7f1d1d,
		0 5px 6px rgba(0, 0, 0, 0.3);
}

.command-button:active {
	transform: translateY(3px);
	box-shadow:
		0 1px 0px #7f1d1d,
		0 2px 4px rgba(0, 0, 0, 0.3);
}

.command-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.dropdown {
	position: relative;
	display: inline-block;
}

.dropdown-toggle {
	border-color: #666;
	color: #666;
}

.dropdown-content {
	display: none;
	position: absolute;
	right: 0;
	background: #000;
	min-width: 160px;
	box-shadow: 0 0 10px rgba(51, 255, 51, 0.3);
	z-index: 1;
	border: 2px solid #666;
}

.dropdown:hover .dropdown-content {
	display: block;
}

.dropdown-item {
	width: 100%;
	padding: 8px 16px;
	background: none;
	border: none;
	color: #ff3333;
	font-family: 'Press Start 2P', 'Courier New', monospace;
	font-size: 8px;
	cursor: pointer;
	text-align: left;
}

.dropdown-item:hover:not(:disabled) {
	background-color: #ff3333;
	color: #000;
}

.dropdown-item:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

/* Scrollbar styling */
.game-output::-webkit-scrollbar {
	width: 14px;
}

.game-output::-webkit-scrollbar-track {
	background: #374151;
	border: 2px solid #f3f4f6;
}

.game-output::-webkit-scrollbar-thumb {
	background: linear-gradient(145deg, #7c3aed 0%, #5b21b6 100%);
	border: 1px solid #f3f4f6;
}

.game-output::-webkit-scrollbar-thumb:hover {
	background: linear-gradient(145deg, #8b5cf6 0%, #7c3aed 100%);
}

/* Deep styles for inline components */
:deep(.item) {
	color: #ffcc00;
	font-weight: bold;
}

:deep(.person) {
	color: #ff6b6b;
	font-weight: bold;
}

:deep(.place) {
	color: #4dffb8;
	font-weight: bold;
}

.player-location {
	position: fixed;
	top: 20px;
	left: 20px;
	background: #000;
	border: 2px solid #33ff33;
	padding: 10px;
	font-family: 'Press Start 2P', 'Courier New', monospace;
	z-index: 1000;
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.location-label {
	color: #666;
	font-size: 8px;
}

.coordinates {
	color: #33ff33;
	font-weight: bold;
	font-size: 10px;
}

.place-name {
	color: #66ff66;
	font-weight: bold;
	font-size: 10px;
}

@media (max-width: 600px) {
	.game-output, .input-container, .command-buttons {
		width: 95%;
	}
	.player-location {
		position: static;
		margin-bottom: 10px;
	}
}
</style>
