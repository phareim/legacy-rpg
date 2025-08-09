<template>
  <div class="game-container">
    <div class="story-window">
      <p>Welcome to the Legacy of the Elden Stones.</p>
      <p>The wind howls around you as you stand on the precipice of the forgotten kingdom of Aerthos. Before you lies a path shrouded in mist, and the scent of ancient magic hangs heavy in the air. Your quest begins now.</p>
      <p>What do you do?</p>
    </div>
    <div class="command-bar">
      <button>Look</button>
      <button>Go North</button>
      <button>Go South</button>
      <button>Inventory</button>
      <button>Help</button>
    </div>
    <div class="input-area">
      <input type="text" placeholder="Enter your command...">
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Roboto:wght@300;400;700&family=Playwrite+AU+SA&display=swap');

body {
  background-color: #f0e8d8; /* A warm, papery color */
  margin: 0;
  font-family: 'Roboto', sans-serif;
  color: #3a3a3a;
}

.game-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  box-shadow: 0 0 10px rgba(0,0,0,0.1), 0 0 20px rgba(0,0,0,0.05);
  border: 1px solid #ddd;
  position: relative;
}

/* Folded paper effect */
.game-container::before, .game-container::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20px;
  background: linear-gradient(to right, rgba(0,0,0,0.05), rgba(0,0,0,0));
  z-index: -1;
}

.game-container::before {
    left: -21px;
    transform: rotate(2deg);
    box-shadow: -2px 0 5px rgba(0,0,0,0.2);
}

.game-container::after {
    right: -21px;
    transform: rotate(-2deg);
    background: linear-gradient(to left, rgba(0,0,0,0.05), rgba(0,0,0,0));
    box-shadow: 2px 0 5px rgba(0,0,0,0.2);
}


.story-window {
  flex-grow: 1;
  padding: 40px;
  overflow-y: auto;
  font-family: 'Playwrite AU SA', cursive;
  font-size: 1.5rem;
  line-height: 1.8;
  color: #2c3e50;
}

.story-window p {
  margin-bottom: 1.5em;
}

.command-bar {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 15px;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  background-color: #fafafa;
}

.command-bar button {
  font-family: 'Roboto', sans-serif;
  background-color: #fff;
  border: 1px solid #ccc;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: bold;
  color: #555;
  box-shadow: 0 2px 2px rgba(0,0,0,0.05);
}

.command-bar button:hover {
  background-color: #f5f5f5;
  border-color: #aaa;
  box-shadow: 0 3px 4px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}

.command-bar button:active {
  background-color: #eee;
  box-shadow: 0 1px 1px rgba(0,0,0,0.1);
  transform: translateY(0);
}


.input-area {
  padding: 20px;
}

.input-area input {
  width: 100%;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1.1rem;
  font-family: 'Playwrite AU SA', cursive;
  box-sizing: border-box; /* To include padding in the width */
}

.input-area input:focus {
  outline: none;
  border-color: #a0937d;
  box-shadow: 0 0 5px rgba(160, 147, 125, 0.5);
}
</style>
