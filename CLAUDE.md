# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Legacy RPG is a text-based interactive game built with Nuxt.js 3 and Vue.js. The core concept is a "legacy" game that evolves and changes as players interact with it, with persistent changes to the game world.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
nuxt build

# Generate static site
npm run generate

# Preview production build
npm run preview

# Install dependencies and prepare Nuxt
npm run postinstall
```

## Architecture

This is a Nuxt.js 3 application with the following structure:

- **app.vue**: Root application component with basic Firebase integration
- **nuxt.config.ts**: Main configuration with Firebase environment variables and runtime config
- **server/**: Server-side API endpoints (currently empty but intended for game logic)
- **services/**: API service layer (currently minimal, contains only README)
- **pages/**: File-based routing pages (currently empty)
- **components/**: Vue components (currently empty)
- **plugins/**: Nuxt plugins (currently empty)
- **types/**: TypeScript type definitions (currently empty)

## Game Architecture

The game operates on three core entities:
- **Locations**: Named areas with coordinates (x,y format), descriptions, and contained items/characters
- **Items**: Interactive objects that can be picked up, dropped, and used (marked with `*item*` in descriptions)
- **Characters**: NPCs that can be interacted with and carry items (marked with `**character**` in descriptions)

Navigation uses coordinate system starting at `0,0` with directional movement commands (north, south, east, west).

## Technology Stack

- **Frontend**: Nuxt.js 3 with Vue.js and TypeScript
- **Styling**: Tailwind CSS via @nuxtjs/tailwindcss
- **Backend**: Firebase (both client and admin SDK)
- **AI Integration**: OpenAI API integration
- **Environment**: Node.js with ES modules

## Firebase Configuration

The application uses Firebase for data persistence with both client-side and server-side configurations:
- Client config exposed through public runtime config
- Server admin credentials via private runtime config
- All Firebase environment variables must be set for proper operation

## Development Notes

- The project uses TypeScript throughout with Nuxt's built-in TypeScript support
- Server-side functionality should be implemented in the `server/` directory
- Game state persistence and API endpoints will likely use Firebase integration
- The application is designed to be a persistent, evolving game world where player actions create lasting changes

# Requirements

# Legacy RPG - System Requirements

## Core Concept
Build a text-based RPG where the world evolves permanently based on player actions. All changes persist in Firebase, creating a true "legacy" experience where every action can potentially reshape the world.

## Database Architecture (Firebase)

### Object Types & Storage Structure
```
/players/[player_name]/
/objects/[item_name]/          # Both common and legendary items
/npcs/[npc_name]/              # All NPCs
/worlds/[world_name]/
  /places/[x,y]/               # Coordinates as IDs
/conversations/[conversation_id]/
/storylines/[storyline_id]/
```

### Naming Convention
- **All IDs are lowercase versions of the entity name**
- **Names are eternal and unique** - only one "jaffar the wanderer" can exist
- **Content under a name can evolve, but the name/ID remains constant**

## Item System

### Common Items
- Template-based (e.g., "old sword", "piece of cheese")
- Not tracked individually - only quantities in inventories
- Interchangeable and disposable
- Stored once with base attributes

### Legendary Items  
- Unique entities with persistent identity
- Evolve based on usage and story events
- Have history/memory of significant events
- Only one instance exists in the world

### Item Evolution
- Common items can become legendary through gameplay
- When evolution occurs, create new legendary item with new name
- Evolution determined by AI checking trigger conditions

## Core Game Objects

### Players
```javascript
{
  name: string,
  location: {world: string, x: number, y: number},
  inventory: {[item_name]: quantity},
  stats: object,
  active_storylines: [string],
  history: [string]
}
```

### Places
```javascript
{
  name: string,
  description: string,  // Contains markup: ***locations***, *items*, **npcs**
  coordinates: {x: number, y: number},
  objects: [string],    // Item names present
  npcs: [string],       // NPC names present
  evolution_trigger: string
}
```

### NPCs
```javascript
{
  name: string,
  description: string,
  location: {world: string, x: number, y: number},
  inventory: {[item_name]: quantity},
  conversation_id: string,
  memory: [string],     // Past interactions
  evolution_trigger: string
}
```

### Objects/Items
```javascript
{
  name: string,
  description: string,
  type: "common" | "legendary",
  attributes: object,
  history: [string],    // For legendary items
  evolution_trigger: string
}
```

### Storylines
```javascript
{
  id: string,
  name: string,
  description: string,
  status: "active" | "completed" | "failed",
  progress: object,
  evolution_trigger: string
}
```

## Game Mechanics

### Movement System
- **Commands:** `move north`, `move south`, `move east`, `move west`
- **Coordinate system:** Player starts at (0,0)
- **Location lookup:** Query `/worlds/[world]/places/[x,y]/`
- **Update player location** in database after each move

### Interaction Commands
- `examine [object/character/location]`
- `take [item]` / `drop [item]`
- `talk to [character]`
- `use [item]` / `use [item] on [target]`
- `inventory` / `look`

### Command Processing
1. Parse user input
2. Validate command and targets
3. Execute action and update database
4. Check for evolution triggers
5. Generate response with updated world state

## Evolution Trigger System

### Trigger Format
- **Stored as text strings** in each object's `evolution_trigger` field
- **AI responsibility:** Check if current gameplay meets trigger conditions
- **When triggered:** Create new entity with evolved name/properties

### Evolution Examples
```
Item: "old sword" -> "the blade that ended the shadow war"
Trigger: "When used to strike the killing blow against a creature of darkness"

NPC: "jaffar the wanderer" -> "jaffar the wise"  
Trigger: "When he helps solve three major conflicts through wisdom rather than force"

Place: "quiet village" -> "the last sanctuary"
Trigger: "When it becomes refuge for people fleeing widespread danger"
```

### Evolution Processing
1. After each player action, AI evaluates all relevant evolution triggers
2. If trigger conditions met, create new evolved entity
3. Update all references to point to new entity
4. Preserve history/continuity in the evolution

## AI Integration Requirements

### Dynamic Description Updates
- **Location descriptions** must reflect current objects/NPCs using markup
- **Auto-generate** updated descriptions when world state changes
- **Maintain consistency** with established world tone and style

### Storytelling AI Responsibilities
1. **Parse and execute** player commands
2. **Generate narrative responses** to player actions
3. **Evaluate evolution triggers** after each action
4. **Create evolved entities** when triggers are met
5. **Maintain world consistency** and story coherence
6. **Update cross-references** when entities evolve

## Technical Implementation

### Real-time Updates
- All changes propagate to Firebase immediately
- Single-player assumption (no concurrency handling needed initially)
- Use Firebase real-time listeners for live world state

### Command Line Interface
- Text input/output only
- Clear command parsing and validation
- Helpful error messages for invalid commands
- Rich narrative descriptions for successful actions

### Data Consistency
- Validate entity references exist before creating relationships
- Handle cascading updates when entities evolve
- Maintain referential integrity across storylines

## Success Criteria
- Player can navigate world using coordinate-based movement
- Items can be picked up, dropped, and used
- NPCs can be interacted with through conversations
- World state persists between sessions
- Evolution triggers create meaningful world changes
- All entity references remain valid after evolutions
- Rich, dynamic storytelling responds to player actions