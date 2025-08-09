<template>
  <div class="rpg-container">
    <!-- Main game window -->
    <div class="game-window">
      <!-- Story text area -->
      <div class="story-text" ref="storyContainer">
        <div class="text-content">
          <p 
            v-for="(line, index) in storyLines" 
            :key="index"
            class="story-line"
          >
            {{ line }}
          </p>
        </div>
      </div>

      <!-- Command buttons -->
      <div class="command-buttons">
        <button 
          v-for="command in commands" 
          :key="command.action"
          @click="executeCommand(command.action)"
          class="command-btn"
        >
          {{ command.label }}
        </button>
      </div>

      <!-- Input area -->
      <div class="input-area">
        <input 
          v-model="userInput"
          @keyup.enter="submitCommand"
          type="text" 
          placeholder="Enter your command..."
          class="command-input"
          ref="commandInput"
        />
        <button @click="submitCommand" class="submit-btn">Enter</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const userInput = ref('')
const storyContainer = ref(null)
const commandInput = ref(null)

const commands = ref([
  { label: 'Look', action: 'look' },
  { label: 'Inventory', action: 'inventory' },
  { label: 'North', action: 'north' },
  { label: 'South', action: 'south' },
  { label: 'East', action: 'east' },
  { label: 'West', action: 'west' },
  { label: 'Help', action: 'help' }
])

const storyLines = ref([
  'Welcome to the Ancient Library of Mysteries...',
  'You find yourself standing before towering bookshelves filled with leather-bound tomes. The air smells of old parchment and forgotten knowledge.',
  'Dust motes dance in the amber light filtering through stained glass windows.',
  'What would you like to do?'
])

const executeCommand = (action) => {
  addStoryLine(`> ${action}`)
  
  // Simple command responses for demo
  switch(action) {
    case 'look':
      addStoryLine('You see ancient books, flickering candles, and mysterious shadows dancing on the walls.')
      break
    case 'inventory':
      addStoryLine('You carry: a worn leather satchel, a brass key, and a mysterious scroll.')
      break
    case 'help':
      addStoryLine('Available commands: look, inventory, north, south, east, west, or type custom commands.')
      break
    default:
      addStoryLine(`You attempt to ${action}... The ancient library seems to whisper in response.`)
  }
}

const submitCommand = () => {
  if (userInput.value.trim()) {
    addStoryLine(`> ${userInput.value}`)
    addStoryLine(`You speak the words "${userInput.value}" into the mystical air...`)
    userInput.value = ''
  }
}

const addStoryLine = (line) => {
  storyLines.value.push(line)
  nextTick(() => {
    scrollToBottom()
  })
}

const scrollToBottom = () => {
  if (storyContainer.value) {
    storyContainer.value.scrollTop = storyContainer.value.scrollHeight
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Roboto:wght@300;400;700&family=Playwrite+AU+SA&display=swap');

.rpg-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #2d1810 0%, #4a2c1a 100%);
  padding: 20px;
  font-family: 'Lora', serif;
}

.game-window {
  max-width: 800px;
  margin: 0 auto;
  background: linear-gradient(145deg, #f4e5d3 0%, #e8d5b7 100%);
  border: 8px solid #8b4513;
  border-radius: 15px;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.3),
    inset 0 2px 8px rgba(255, 255, 255, 0.2),
    inset 0 -2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.game-window::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 30%, rgba(139, 69, 19, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(101, 67, 33, 0.03) 0%, transparent 50%);
  pointer-events: none;
}

.story-text {
  height: 400px;
  overflow-y: auto;
  padding: 30px;
  background: linear-gradient(145deg, #faf6f0 0%, #f0e6d6 100%);
  border-bottom: 3px solid #8b4513;
  position: relative;
}

.story-text::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 24px,
      rgba(139, 69, 19, 0.1) 25px
    );
  pointer-events: none;
}

.text-content {
  position: relative;
  z-index: 1;
}

.story-line {
  margin: 0 0 15px 0;
  line-height: 1.6;
  color: #2d1810;
  font-size: 16px;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.story-line:first-letter {
  font-size: 1.2em;
  font-weight: bold;
  color: #8b4513;
}

.command-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 20px 30px;
  background: linear-gradient(145deg, #e8d5b7 0%, #d4c1a4 100%);
  border-bottom: 2px solid #8b4513;
}

.command-btn {
  padding: 8px 16px;
  background: linear-gradient(145deg, #8b4513 0%, #a0522d 100%);
  border: 2px solid #654321;
  border-radius: 6px;
  color: #f4e5d3;
  font-family: 'Playwrite AU SA', cursive;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 3px rgba(255, 255, 255, 0.2);
}

.command-btn:hover {
  background: linear-gradient(145deg, #a0522d 0%, #cd853f 100%);
  transform: translateY(-1px);
  box-shadow: 
    0 6px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 3px rgba(255, 255, 255, 0.3);
}

.command-btn:active {
  transform: translateY(0px);
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.input-area {
  display: flex;
  padding: 20px 30px;
  background: linear-gradient(145deg, #d4c1a4 0%, #c2af92 100%);
  gap: 10px;
}

.command-input {
  flex: 1;
  padding: 12px 16px;
  background: linear-gradient(145deg, #faf6f0 0%, #f0e6d6 100%);
  border: 3px solid #8b4513;
  border-radius: 8px;
  font-family: 'Lora', serif;
  font-size: 16px;
  color: #2d1810;
  box-shadow: 
    inset 0 2px 6px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(255, 255, 255, 0.3);
}

.command-input:focus {
  outline: none;
  border-color: #cd853f;
  box-shadow: 
    inset 0 2px 6px rgba(0, 0, 0, 0.1),
    0 0 10px rgba(205, 133, 63, 0.3);
}

.command-input::placeholder {
  color: #8b6f47;
  font-style: italic;
}

.submit-btn {
  padding: 12px 20px;
  background: linear-gradient(145deg, #8b4513 0%, #a0522d 100%);
  border: 3px solid #654321;
  border-radius: 8px;
  color: #f4e5d3;
  font-family: 'Playwrite AU SA', cursive;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 3px rgba(255, 255, 255, 0.2);
}

.submit-btn:hover {
  background: linear-gradient(145deg, #a0522d 0%, #cd853f 100%);
  transform: translateY(-1px);
  box-shadow: 
    0 6px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 3px rgba(255, 255, 255, 0.3);
}

.submit-btn:active {
  transform: translateY(0px);
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Scrollbar styling */
.story-text::-webkit-scrollbar {
  width: 12px;
}

.story-text::-webkit-scrollbar-track {
  background: #d4c1a4;
  border-radius: 6px;
}

.story-text::-webkit-scrollbar-thumb {
  background: linear-gradient(145deg, #8b4513 0%, #a0522d 100%);
  border-radius: 6px;
  border: 2px solid #d4c1a4;
}

.story-text::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(145deg, #a0522d 0%, #cd853f 100%);
}
</style>