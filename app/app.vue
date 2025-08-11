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
          <p class="story-line cursor-line">
            <span class="blinking-cursor" :class="{ 'visible': showCursor }">█</span>
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
import { ref, nextTick, onMounted } from 'vue'

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
  'Welcome brave adventurer to the Crystal Realm!',
  'You stand at the entrance of the ancient Dungeon of Shadows.',
  'The stone walls are covered in mystical runes that glow with an eerie blue light.',
  'Your leather boots echo through the cold, damp corridors.',
  'In the distance, you hear the growl of a fearsome beast.',
  'Your trusty sword gleams in the torchlight. What do you do?'
])

const executeCommand = (action) => {
  addStoryLine(`You ${action}...`)
  
  // Fantasy adventure command responses
  switch(action) {
    case 'look':
      addStoryLine('The dungeon chamber is dimly lit by flickering torches.')
      addStoryLine('Ancient stone pillars support a vaulted ceiling.')
      addStoryLine('You see: A wooden chest, rusty armor, and mysterious symbols on the walls.')
      break
    case 'inventory':
      addStoryLine('Your adventuring pack contains:')
      addStoryLine('⚔️ Steel Sword (+5 Attack)')
      addStoryLine('🛡️ Leather Shield (+3 Defense)')
      addStoryLine('🧪 Health Potion x3')
      addStoryLine('💰 25 Gold Pieces')
      addStoryLine('🗝️ Rusty Key')
      break
    case 'help':
      addStoryLine('Available commands in your quest:')
      addStoryLine('LOOK - Examine your surroundings')
      addStoryLine('INVENTORY - Check your belongings')
      addStoryLine('NORTH/SOUTH/EAST/WEST - Travel in that direction')
      addStoryLine('Or type custom actions like "attack goblin" or "open chest"')
      break
    case 'north':
      addStoryLine('You venture north through a narrow stone corridor.')
      addStoryLine('The air grows colder and you hear echoing footsteps ahead.')
      break
    case 'south':
      addStoryLine('You head south toward the dungeon entrance.')
      addStoryLine('Faint sunlight filters through cracks in the ancient stonework.')
      break
    case 'east':
      addStoryLine('Moving eastward, you discover a chamber filled with treasure chests.')
      addStoryLine('But beware - something glows menacingly in the shadows!')
      break
    case 'west':
      addStoryLine('You travel west into darker depths of the dungeon.')
      addStoryLine('Strange runes pulse with magical energy along the walls.')
      break
    default:
      addStoryLine(`You attempt to ${action}...`)
      addStoryLine('The ancient magic of the realm responds to your actions with mysterious energy.')
  }
}

const submitCommand = () => {
  if (userInput.value.trim()) {
    addStoryLine(`> ${userInput.value}`)
    addStoryLine(`You speak the words "${userInput.value}" into the mystical air...`)
    addStoryLine('The dungeon echoes with the power of your command!')
    userInput.value = ''
  }
}

const addStoryLine = (line) => {
  storyLines.value.push(line)
  nextTick(() => {
    scrollToBottom()
  })
}

// Add blinking cursor effect (only in browser)
const showCursor = ref(true)

onMounted(() => {
  setInterval(() => {
    showCursor.value = !showCursor.value
  }, 500)
})

const scrollToBottom = () => {
  if (storyContainer.value) {
    storyContainer.value.scrollTop = storyContainer.value.scrollHeight
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&display=swap');

.rpg-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%);
  padding: 20px;
  font-family: 'Press Start 2P', cursive;
  position: relative;
  overflow: hidden;
}

.rpg-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(255, 255, 255, 0.02) 3px,
      rgba(255, 255, 255, 0.02) 6px
    );
  pointer-events: none;
  z-index: 1;
}

.game-window {
  max-width: 800px;
  margin: 0 auto;
  background: #4b5563;
  border: 4px solid #f3f4f6;
  border-radius: 0;
  box-shadow: 
    0 0 0 2px #1f2937,
    0 8px 16px rgba(0, 0, 0, 0.6),
    inset 0 2px 4px rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 2;
  overflow: hidden;
}

.game-window::before {
  content: '⚔️ LEGENDS OF THE CRYSTAL REALM ⚔️';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%);
  color: #fff;
  padding: 12px 16px;
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  text-align: center;
  text-shadow: 2px 2px 0px #000;
  z-index: 3;
  border-bottom: 2px solid #f3f4f6;
}

.story-text {
  height: 400px;
  overflow-y: auto;
  padding: 50px 20px 20px 20px;
  background: linear-gradient(145deg, #1f2937 0%, #111827 100%);
  border-bottom: 4px solid #f3f4f6;
  position: relative;
}

.story-text::before {
  content: '';
  position: absolute;
  top: 40px;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 15px,
      rgba(156, 163, 175, 0.1) 16px
    );
  pointer-events: none;
}

.text-content {
  position: relative;
  z-index: 1;
}

.story-line {
  margin: 0 0 12px 0;
  line-height: 1.6;
  color: #f9fafb;
  font-size: 11px;
  font-family: 'Press Start 2P', cursive;
  text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
  letter-spacing: 1px;
}

.story-line:before {
  content: '★ ';
  color: #fbbf24;
  margin-right: 4px;
}

.command-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 20px;
  background: linear-gradient(145deg, #374151 0%, #1f2937 100%);
  border-bottom: 4px solid #f3f4f6;
}

.command-btn {
  padding: 8px 12px;
  background: linear-gradient(145deg, #dc2626 0%, #b91c1c 100%);
  border: 2px solid #fef2f2;
  border-radius: 0;
  color: #fff;
  font-family: 'Press Start 2P', cursive;
  font-size: 8px;
  cursor: pointer;
  transition: all 0.1s ease;
  text-transform: uppercase;
  box-shadow: 
    0 4px 0px #7f1d1d,
    0 6px 8px rgba(0, 0, 0, 0.3);
  position: relative;
  letter-spacing: 0.5px;
}

.command-btn:hover {
  background: linear-gradient(145deg, #ef4444 0%, #dc2626 100%);
  transform: translateY(1px);
  box-shadow: 
    0 3px 0px #7f1d1d,
    0 5px 6px rgba(0, 0, 0, 0.3);
  animation: buttonBounce 0.3s ease-in-out;
}

.command-btn:active {
  transform: translateY(3px);
  box-shadow: 
    0 1px 0px #7f1d1d,
    0 2px 4px rgba(0, 0, 0, 0.3);
}

.input-area {
  display: flex;
  padding: 16px 20px;
  background: linear-gradient(145deg, #1f2937 0%, #111827 100%);
  gap: 12px;
  align-items: center;
}

.input-area::before {
  content: '>';
  color: #fbbf24;
  font-family: 'Press Start 2P', cursive;
  font-size: 12px;
  text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
}

.command-input {
  flex: 1;
  padding: 12px 16px;
  background: linear-gradient(145deg, #4b5563 0%, #374151 100%);
  border: 3px solid #f3f4f6;
  border-radius: 0;
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  color: #f9fafb;
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2);
  caret-color: #fbbf24;
  letter-spacing: 1px;
}

.command-input:focus {
  outline: none;
  border-color: #fbbf24;
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 0 8px rgba(251, 191, 36, 0.5);
}

.command-input::placeholder {
  color: #9ca3af;
  opacity: 0.7;
}

.submit-btn {
  padding: 12px 16px;
  background: linear-gradient(145deg, #059669 0%, #047857 100%);
  border: 3px solid #fef2f2;
  border-radius: 0;
  color: #fff;
  font-family: 'Press Start 2P', cursive;
  font-size: 8px;
  cursor: pointer;
  transition: all 0.1s ease;
  text-transform: uppercase;
  box-shadow: 
    0 4px 0px #064e3b,
    0 6px 8px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.5px;
}

.submit-btn:hover {
  background: linear-gradient(145deg, #10b981 0%, #059669 100%);
  transform: translateY(1px);
  box-shadow: 
    0 3px 0px #064e3b,
    0 5px 6px rgba(0, 0, 0, 0.3);
}

.submit-btn:active {
  transform: translateY(3px);
  box-shadow: 
    0 1px 0px #064e3b,
    0 2px 4px rgba(0, 0, 0, 0.3);
}

/* Custom scrollbar */
.story-text::-webkit-scrollbar {
  width: 14px;
}

.story-text::-webkit-scrollbar-track {
  background: #374151;
  border: 2px solid #f3f4f6;
}

.story-text::-webkit-scrollbar-thumb {
  background: linear-gradient(145deg, #7c3aed 0%, #5b21b6 100%);
  border-radius: 0;
  border: 1px solid #f3f4f6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.story-text::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(145deg, #8b5cf6 0%, #7c3aed 100%);
}

.cursor-line {
  margin-top: 10px;
}

.blinking-cursor {
  color: #fbbf24;
  font-family: 'Press Start 2P', cursive;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.1s ease;
  text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
}

.blinking-cursor.visible {
  opacity: 1;
}

/* NES-style button animations */
@keyframes buttonBounce {
  0%, 100% { transform: translateY(1px); }
  50% { transform: translateY(-1px); }
}

/* Add some sparkle to the title */
@keyframes titleGlow {
  0%, 100% { text-shadow: 2px 2px 0px #000, 0 0 10px rgba(124, 58, 237, 0.5); }
  50% { text-shadow: 2px 2px 0px #000, 0 0 20px rgba(124, 58, 237, 0.8), 0 0 30px rgba(168, 85, 247, 0.3); }
}

.game-window::before {
  animation: titleGlow 2s ease-in-out infinite;
}

/* Pixel-perfect NES styling */
* {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}
</style>