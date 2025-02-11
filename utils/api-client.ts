import { mockPlaces } from './mock-data'

export class APIClient {
  static async processCommand(command: string, userId: string): Promise<{ response: string } | { error: string }> {
    // Simple command processing logic
    const cmd = command.toLowerCase()
    
    if (cmd === 'look') {
      return {
        response: 'You see a peaceful forest clearing. A *rusty-sword* lies nearby. You can see the ***village-gate*** in the distance, and **Old Merchant** is standing by a tree.'
      }
    }
    
    if (cmd === 'inventory') {
      return {
        response: 'You are carrying: *rusty-sword*'
      }
    }
    
    if (cmd.startsWith('go ')) {
      const direction = cmd.split(' ')[1]
      if (['north', 'south', 'east', 'west'].includes(direction)) {
        return {
          response: `You move ${direction}. You find yourself in a new area.`
        }
      }
    }
    
    if (cmd.startsWith('examine ')) {
      const target = cmd.split('examine ')[1]
      return {
        response: `You examine the ${target} carefully.`
      }
    }
    
    if (cmd === 'help') {
      return {
        response: 'Available commands: look, inventory, go [direction], examine [target], talk to [character]'
      }
    }
    
    return {
      response: "I don't understand that command."
    }
  }
} 