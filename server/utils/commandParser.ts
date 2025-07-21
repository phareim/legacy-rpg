export interface ParsedCommand {
  action: string
  target?: string
  object?: string
  direction?: 'north' | 'south' | 'east' | 'west'
  original: string
}

export class CommandParser {
  private static readonly MOVEMENT_COMMANDS = ['move', 'go', 'walk']
  private static readonly DIRECTIONS = ['north', 'south', 'east', 'west', 'n', 's', 'e', 'w']
  private static readonly ACTION_COMMANDS = ['look', 'examine', 'take', 'drop', 'use', 'talk', 'inventory', 'inv']

  static parse(input: string): ParsedCommand {
    const trimmed = input.toLowerCase().trim()
    const words = trimmed.split(/\s+/)
    
    if (words.length === 0) {
      throw new Error('Empty command')
    }

    const command = words[0]
    const parsed: ParsedCommand = {
      action: command,
      original: input
    }

    // Handle movement commands
    if (this.MOVEMENT_COMMANDS.includes(command)) {
      if (words.length < 2) {
        throw new Error('Movement commands require a direction')
      }
      
      const direction = this.normalizeDirection(words[1])
      if (!direction) {
        throw new Error(`Invalid direction: ${words[1]}`)
      }
      
      parsed.action = 'move'
      parsed.direction = direction
      return parsed
    }

    // Handle direction-only commands (e.g., "north", "n")
    const direction = this.normalizeDirection(command)
    if (direction) {
      parsed.action = 'move'
      parsed.direction = direction
      return parsed
    }

    // Handle look/examine commands
    if (['look', 'l'].includes(command)) {
      if (words.length === 1) {
        parsed.action = 'look'
        return parsed
      }
      
      // Skip "at" if present: "look at sword" -> "examine sword"
      const startIndex = words[1] === 'at' ? 2 : 1
      parsed.action = 'examine'
      parsed.target = words.slice(startIndex).join(' ')
      return parsed
    }

    // Handle examine command
    if (command === 'examine') {
      if (words.length < 2) {
        throw new Error('Examine command requires a target')
      }
      parsed.target = words.slice(1).join(' ')
      return parsed
    }

    // Handle take/get commands
    if (['take', 'get', 'pick'].includes(command)) {
      if (words.length < 2) {
        throw new Error('Take command requires an item')
      }
      
      // Skip "up" if present: "pick up sword" -> "take sword"
      const startIndex = words[1] === 'up' ? 2 : 1
      parsed.action = 'take'
      parsed.target = words.slice(startIndex).join(' ')
      return parsed
    }

    // Handle drop command
    if (command === 'drop') {
      if (words.length < 2) {
        throw new Error('Drop command requires an item')
      }
      parsed.target = words.slice(1).join(' ')
      return parsed
    }

    // Handle use command
    if (command === 'use') {
      if (words.length < 2) {
        throw new Error('Use command requires an item')
      }
      
      // Check for "use X on Y" pattern
      const onIndex = words.indexOf('on')
      if (onIndex > 1) {
        parsed.target = words.slice(1, onIndex).join(' ')
        parsed.object = words.slice(onIndex + 1).join(' ')
      } else {
        parsed.target = words.slice(1).join(' ')
      }
      return parsed
    }

    // Handle talk command
    if (['talk', 'speak'].includes(command)) {
      if (words.length < 2) {
        throw new Error('Talk command requires a target')
      }
      
      // Skip "to" if present: "talk to elder" -> "talk elder"
      const startIndex = words[1] === 'to' ? 2 : 1
      parsed.action = 'talk'
      parsed.target = words.slice(startIndex).join(' ')
      return parsed
    }

    // Handle inventory command
    if (['inventory', 'inv', 'i'].includes(command)) {
      parsed.action = 'inventory'
      return parsed
    }

    // Handle help command
    if (['help', 'h', '?'].includes(command)) {
      parsed.action = 'help'
      return parsed
    }

    // If no specific handler, return as-is but validate it's a known action
    if (!this.ACTION_COMMANDS.includes(command)) {
      throw new Error(`Unknown command: ${command}`)
    }

    return parsed
  }

  private static normalizeDirection(dir: string): 'north' | 'south' | 'east' | 'west' | null {
    const dirMap: { [key: string]: 'north' | 'south' | 'east' | 'west' } = {
      'north': 'north',
      'n': 'north',
      'south': 'south',
      's': 'south',
      'east': 'east',
      'e': 'east',
      'west': 'west',
      'w': 'west'
    }
    
    return dirMap[dir.toLowerCase()] || null
  }

  static getHelpText(): string {
    return `Available commands:
Movement: north/n, south/s, east/e, west/w, move [direction]
Interaction: look, examine [target], take [item], drop [item]
Social: talk to [character]
Items: use [item], use [item] on [target], inventory/inv
General: help/?`
  }
}