import OpenAI from 'openai'
import type { Location } from '~/types/generics'
import type { ChatCompletionCreateParams } from 'openai/resources'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const SYSTEM_PROMPT = `You are a text-based RPG game engine running a simple adventure game.

Game Rules:
- Keep responses engaging, but fairly short (max 3-6 sentences)
- Give meaningful responses to player actions
- Create an engaging game experience
- Be creative but consistent
- Respond in English
- Try to keep this fairly NSFW (people can go elsewhere for more explicit content)

The game world is procedurally generated as players explore. Each time a player moves to an unexplored area, 
a new location is automatically created, making the world expand dynamically.

Formatting Rules:
- All items that players can pick up should be written with *asterisks* around them (e.g., *rusty sword*)
- All people that players can interact with should be written with double **asterisks** around them (e.g., **old merchant**)
- All notable locations should be written with triple ***asterisks*** around them (e.g., ***ancient ruins***)

Theme: A mysterious fantasy forest world that expands infinitely in all directions, with each new area being uniquely generated based on its surroundings.

When describing a location:
- Use about 3-6 sentences
- Make descriptions atmospheric and evocative but concise
- Use short but descriptive names for places
- Include the stored description but feel free to add atmospheric details
- Consider the surrounding areas for context when generating new locations`

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { north, west } = query

  if (!north || !west) {
    throw createError({
      statusCode: 400,
      message: 'Missing coordinates (north, west)'
    })
  }

  // Create a message to OpenAI that asks for a location description
  const messages: ChatCompletionCreateParams['messages'] = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { 
      role: 'user' as const, 
      content: `Generate a name and description for a location at coordinates N:${north}, W:${west}. 
      Return it in the following JSON format:
      {
        "name": "short but evocative name",
        "description": "atmospheric description following the formatting rules"
      }
      The description should include at least one item, character, or connected location using the proper formatting.`
    }
  ]

  try {
    // Send to OpenAI
    const completion = await openai.chat.completions.create({
      model:  "llama-3.2-3b",//"llama-3.1-405b",
      messages,
      temperature: 0.8,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    const locationData = JSON.parse(response)

    // Create the full location object
    const location: Location = {
      coordinates: {
        north: Number(north),
        west: Number(west)
      },
      name: locationData.name,
      description: locationData.description,
      type: 'location', // Default type, could be made dynamic based on description
      connections: [], // These would be filled in by the game logic
      createdAt: new Date(),
      updatedAt: new Date(),
      legacy: false,
      properties: {
        explored: false,
        danger_level: Math.floor(Math.random() * 5) + 1
      }
    }

    return location
  } catch (error) {
    console.error('Error generating location:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to generate location'
    })
  }
})

/*
 * Sending to the LLM, works as follows:
 *   // Send to Venice/OpenAI
 *   const completion = await openai.chat.completions.create({
 *       model: "llama-3.1-405b",
 *       messages: messageHistory,
 *       temperature: 0.8,
 *       max_tokens: 1000
 *   })
 *   // Get response
 *   const response = completion.choices[0]?.message?.content || 'Sorry, I did not understand that.' 
 */