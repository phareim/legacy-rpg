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
  'SYSTEM BOOT COMPLETE - NEURAL LINK ESTABLISHED',
  'CONNECTING TO CYBERSPACE MAINFRAME...',
  'ACCESS GRANTED - WELCOME TO THE DIGITAL UNDERGROUND',
  'You jack into the neon-lit data stream of the corporate network. Green code cascades past your vision.',
  'Warning: ICE detected in sector 7. Proceed with caution.',
  'Your cyberdeck hums with electric potential. What is your next move, netrunner?'
])

const executeCommand = (action) => {
  addStoryLine(`EXECUTING: ${action.toUpperCase()}`)
  
  // Cyberpunk command responses
  switch(action) {
    case 'look':
      addStoryLine('SCAN COMPLETE: Data nodes pulse with electric blue energy. Corporate firewalls shimmer like digital barriers.')
      addStoryLine('DETECTED: 3 access ports, 1 encrypted terminal, multiple data streams.')
      break
    case 'inventory':
      addStoryLine('CYBERDECK INVENTORY LOADED:')
      addStoryLine('- NEURAL INTERFACE v2.3 [ACTIVE]')
      addStoryLine('- ICE BREAKER UTILITY [READY]')
      addStoryLine('- STEALTH PROTOCOL [STANDBY]')
      addStoryLine('- 500 CREDITS [ENCRYPTED]')
      break
    case 'help':
      addStoryLine('AVAILABLE SYSTEM COMMANDS:')
      addStoryLine('LOOK - Scan current sector | INVENTORY - Check gear status')
      addStoryLine('NAVIGATION: NORTH/SOUTH/EAST/WEST - Move through network')
      addStoryLine('CUSTOM COMMANDS: Type any action to interface with the system')
      break
    default:
      addStoryLine(`PROCESSING: ${action.toUpperCase()}...`)
      addStoryLine('The system responds with a cascade of green data. Neural pathways light up with digital fire.')
  }
}

const submitCommand = () => {
  if (userInput.value.trim()) {
    addStoryLine(`INPUT: ${userInput.value.toUpperCase()}`)
    addStoryLine(`SYSTEM RESPONSE: Processing command "${userInput.value}"...`)
    addStoryLine('Data streams flicker as your neural command propagates through the network.')
    userInput.value = ''
  }
}

const addStoryLine = (line) => {
  storyLines.value.push(line)
  nextTick(() => {
    scrollToBottom()
  })
}

// Add blinking cursor effect
const showCursor = ref(true)
setInterval(() => {
  showCursor.value = !showCursor.value
}, 500)

const scrollToBottom = () => {
  if (storyContainer.value) {
    storyContainer.value.scrollTop = storyContainer.value.scrollHeight
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=Share+Tech+Mono&family=VT323&display=swap');

.rpg-container {
  min-height: 100vh;
  background: #000;
  padding: 20px;
  font-family: 'Courier Prime', monospace;
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
      transparent 2px,
      rgba(0, 255, 0, 0.03) 2px,
      rgba(0, 255, 0, 0.03) 4px
    );
  pointer-events: none;
  z-index: 1;
}

.game-window {
  max-width: 900px;
  margin: 0 auto;
  background: #000;
  border: 2px solid #00ff00;
  border-radius: 0;
  box-shadow: 
    0 0 20px rgba(0, 255, 0, 0.3),
    inset 0 0 20px rgba(0, 255, 0, 0.1);
  position: relative;
  z-index: 2;
  overflow: hidden;
}

.game-window::before {
  content: 'SYSTEM TERMINAL v2.1.0 - RPG INTERFACE ACTIVE';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: #00ff00;
  color: #000;
  padding: 8px 16px;
  font-family: 'VT323', monospace;
  font-size: 14px;
  font-weight: bold;
  z-index: 3;
}

.story-text {
  height: 400px;
  overflow-y: auto;
  padding: 50px 20px 20px 20px;
  background: #000;
  border-bottom: 2px solid #00ff00;
  position: relative;
}

.text-content {
  position: relative;
  z-index: 1;
}

.story-line {
  margin: 0 0 8px 0;
  line-height: 1.4;
  color: #00ff00;
  font-size: 14px;
  font-family: 'Share Tech Mono', monospace;
  text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
  animation: textGlow 2s ease-in-out infinite alternate;
}

.story-line:before {
  content: '> ';
  color: #00ff00;
  font-weight: bold;
}

@keyframes textGlow {
  from { text-shadow: 0 0 5px rgba(0, 255, 0, 0.5); }
  to { text-shadow: 0 0 10px rgba(0, 255, 0, 0.8), 0 0 15px rgba(0, 255, 0, 0.3); }
}

.command-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 15px 20px;
  background: #000;
  border-bottom: 2px solid #00ff00;
}

.command-btn {
  padding: 8px 16px;
  background: #000;
  border: 2px solid #00ff00;
  border-radius: 0;
  color: #00ff00;
  font-family: 'VT323', monospace;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  position: relative;
}

.command-btn:hover {
  background: #00ff00;
  color: #000;
  box-shadow: 
    0 0 20px rgba(0, 255, 0, 0.8),
    inset 0 0 10px rgba(0, 0, 0, 0.2);
  transform: scale(1.05);
}

.command-btn:active {
  transform: scale(0.95);
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.6);
}

.command-btn::before {
  content: '[';
  margin-right: 4px;
}

.command-btn::after {
  content: ']';
  margin-left: 4px;
}

.input-area {
  display: flex;
  padding: 20px;
  background: #000;
  gap: 15px;
  align-items: center;
}

.input-area::before {
  content: 'CMD>';
  color: #00ff00;
  font-family: 'VT323', monospace;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
}

.command-input {
  flex: 1;
  padding: 12px 16px;
  background: #000;
  border: 2px solid #00ff00;
  border-radius: 0;
  font-family: 'Share Tech Mono', monospace;
  font-size: 16px;
  color: #00ff00;
  box-shadow: 
    inset 0 0 10px rgba(0, 255, 0, 0.1),
    0 0 10px rgba(0, 255, 0, 0.3);
  caret-color: #00ff00;
}

.command-input:focus {
  outline: none;
  border-color: #00ff00;
  box-shadow: 
    inset 0 0 10px rgba(0, 255, 0, 0.2),
    0 0 20px rgba(0, 255, 0, 0.6);
  animation: inputPulse 1s ease-in-out infinite alternate;
}

@keyframes inputPulse {
  from { box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.2), 0 0 20px rgba(0, 255, 0, 0.6); }
  to { box-shadow: inset 0 0 15px rgba(0, 255, 0, 0.3), 0 0 30px rgba(0, 255, 0, 0.8); }
}

.command-input::placeholder {
  color: #008800;
  opacity: 0.7;
}

.submit-btn {
  padding: 12px 20px;
  background: #000;
  border: 2px solid #00ff00;
  border-radius: 0;
  color: #00ff00;
  font-family: 'VT323', monospace;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
}

.submit-btn:hover {
  background: #00ff00;
  color: #000;
  box-shadow: 
    0 0 20px rgba(0, 255, 0, 0.8),
    inset 0 0 10px rgba(0, 0, 0, 0.2);
  transform: scale(1.05);
}

.submit-btn:active {
  transform: scale(0.95);
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.6);
}

.submit-btn::before {
  content: '>>> ';
}

/* Custom scrollbar */
.story-text::-webkit-scrollbar {
  width: 12px;
}

.story-text::-webkit-scrollbar-track {
  background: #000;
  border: 1px solid #00ff00;
}

.story-text::-webkit-scrollbar-thumb {
  background: #00ff00;
  border-radius: 0;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}

.story-text::-webkit-scrollbar-thumb:hover {
  background: #00ff00;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.8);
}

/* CRT Monitor effect */
@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.98; }
}

.game-window {
  animation: flicker 3s linear infinite;
}

.cursor-line {
  margin-top: 10px;
}

.blinking-cursor {
  color: #00ff00;
  font-family: 'VT323', monospace;
  font-size: 16px;
  opacity: 0;
  transition: opacity 0.1s ease;
}

.blinking-cursor.visible {
  opacity: 1;
}

/* Additional retro effects */
.rpg-container::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(circle at center, transparent 70%, rgba(0, 0, 0, 0.3) 100%);
  pointer-events: none;
  z-index: 3;
}

/* Enhance the text glow for better readability */
.story-line {
  text-shadow: 
    0 0 5px rgba(0, 255, 0, 0.5),
    0 0 10px rgba(0, 255, 0, 0.3),
    0 0 15px rgba(0, 255, 0, 0.1);
}
</style>