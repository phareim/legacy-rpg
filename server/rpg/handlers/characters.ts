import type { GameState } from '../state/game-state'
import type { Place } from '../../../types/place'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import OpenAI from 'openai'
import { getR2Json, putR2Json } from '../../utils/r2'

// RPG NPC type
export interface RPGCharacter {
    name: string
    description: string
    personality?: string
    locationNorth: number
    locationWest: number
    hasLeft: boolean
    conversationHistory: ChatCompletionMessageParam[]
    relationshipLevel: number
    mood: 'happy' | 'sad' | 'angry' | 'neutral' | 'fearful' | 'excited'
    questsGiven: string[]
    itemsTraded: string[]
    firstMetAt?: Date
    lastInteractionAt?: Date
    timesSpokenTo: number
    createdAt: Date
    updatedAt: Date
}

// ─── Database helpers ──────────────────────────────────────────────────────────

async function rowToCharacter(row: any, bucket: R2Bucket): Promise<RPGCharacter> {
    // Fetch R2 blobs in parallel
    const [conversationHistory, questsGiven, itemsTraded] = await Promise.all([
        getR2Json<ChatCompletionMessageParam[]>(bucket, `characters/${row.name}/conversation.json`),
        getR2Json<string[]>(bucket, `characters/${row.name}/quests.json`),
        getR2Json<string[]>(bucket, `characters/${row.name}/trades.json`)
    ])

    return {
        name: row.name,
        description: row.description,
        personality: row.personality,
        locationNorth: row.location_north,
        locationWest: row.location_west,
        hasLeft: row.has_left === 1,
        conversationHistory: conversationHistory || [],
        relationshipLevel: row.relationship_level ?? 0,
        mood: row.mood ?? 'neutral',
        questsGiven: questsGiven || [],
        itemsTraded: itemsTraded || [],
        firstMetAt: row.first_met_at ? new Date(row.first_met_at) : undefined,
        lastInteractionAt: row.last_interaction_at ? new Date(row.last_interaction_at) : undefined,
        timesSpokenTo: row.times_spoken_to ?? 0,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    }
}

export async function getCharacter(name: string, db: D1Database, bucket: R2Bucket): Promise<RPGCharacter | null> {
    try {
        const row = await db.prepare(
            'SELECT * FROM characters WHERE name = ?'
        ).bind(name).first<any>()
        if (!row) return null
        return rowToCharacter(row, bucket)
    } catch (error) {
        console.error('Error loading character:', error)
        return null
    }
}

export async function saveCharacter(character: Partial<RPGCharacter> & { name: string }, db: D1Database, bucket: R2Bucket): Promise<void> {
    try {
        const existing = await db.prepare(
            'SELECT name FROM characters WHERE name = ?'
        ).bind(character.name).first<any>()

        // R2 writes (only if data provided)
        const r2Writes: Promise<void>[] = []
        if (character.conversationHistory !== undefined) {
            r2Writes.push(putR2Json(bucket, `characters/${character.name}/conversation.json`, character.conversationHistory))
        }
        if (character.questsGiven !== undefined) {
            r2Writes.push(putR2Json(bucket, `characters/${character.name}/quests.json`, character.questsGiven))
        }
        if (character.itemsTraded !== undefined) {
            r2Writes.push(putR2Json(bucket, `characters/${character.name}/trades.json`, character.itemsTraded))
        }

        if (existing) {
            const sets: string[] = ['updated_at = CURRENT_TIMESTAMP']
            const binds: any[] = []

            if (character.description !== undefined) { sets.push('description = ?'); binds.push(character.description) }
            if (character.personality !== undefined) { sets.push('personality = ?'); binds.push(character.personality) }
            if (character.locationNorth !== undefined) { sets.push('location_north = ?'); binds.push(character.locationNorth) }
            if (character.locationWest !== undefined) { sets.push('location_west = ?'); binds.push(character.locationWest) }
            if (character.hasLeft !== undefined) { sets.push('has_left = ?'); binds.push(character.hasLeft ? 1 : 0) }
            if (character.relationshipLevel !== undefined) { sets.push('relationship_level = ?'); binds.push(character.relationshipLevel) }
            if (character.mood !== undefined) { sets.push('mood = ?'); binds.push(character.mood) }
            if (character.firstMetAt !== undefined) { sets.push('first_met_at = ?'); binds.push(character.firstMetAt.toISOString()) }
            if (character.lastInteractionAt !== undefined) { sets.push('last_interaction_at = ?'); binds.push(character.lastInteractionAt.toISOString()) }
            if (character.timesSpokenTo !== undefined) { sets.push('times_spoken_to = ?'); binds.push(character.timesSpokenTo) }

            binds.push(character.name)

            await Promise.all([
                db.prepare(
                    `UPDATE characters SET ${sets.join(', ')} WHERE name = ?`
                ).bind(...binds).run(),
                ...r2Writes
            ])
        } else {
            await Promise.all([
                db.prepare(`
                    INSERT INTO characters (
                        name, description, personality,
                        location_north, location_west, has_left,
                        relationship_level, mood,
                        first_met_at, last_interaction_at, times_spoken_to
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    character.name,
                    character.description ?? '',
                    character.personality ?? null,
                    character.locationNorth ?? 0,
                    character.locationWest ?? 0,
                    character.hasLeft ? 1 : 0,
                    character.relationshipLevel ?? 0,
                    character.mood ?? 'neutral',
                    character.firstMetAt ? character.firstMetAt.toISOString() : new Date().toISOString(),
                    character.lastInteractionAt ? character.lastInteractionAt.toISOString() : new Date().toISOString(),
                    character.timesSpokenTo ?? 0
                ).run(),
                ...r2Writes
            ])
        }
    } catch (error) {
        console.error('Error saving character:', error)
        throw new Error('Failed to save character')
    }
}

export async function initializeCharacter(
    characterName: string,
    description: string,
    personality: string,
    coordinates: Place['coordinates'],
    db: D1Database,
    bucket: R2Bucket
): Promise<void> {
    const existing = await getCharacter(characterName, db, bucket)
    if (existing) return

    await saveCharacter({
        name: characterName,
        description,
        personality,
        locationNorth: coordinates.north,
        locationWest: coordinates.west,
        hasLeft: false,
        conversationHistory: [],
        relationshipLevel: 0,
        mood: 'neutral',
        questsGiven: [],
        itemsTraded: [],
        firstMetAt: new Date(),
        lastInteractionAt: new Date(),
        timesSpokenTo: 0
    }, db, bucket)

    console.log(`Initialized new character: ${characterName}`)
}

export async function addToCharacterConversation(
    characterName: string,
    userMessage: string,
    npcResponse: string,
    db: D1Database,
    bucket: R2Bucket
): Promise<void> {
    try {
        const character = await getCharacter(characterName, db, bucket)
        if (!character) {
            console.warn('Tried to add conversation to non-existent character:', characterName)
            return
        }

        const updatedHistory = [
            ...character.conversationHistory,
            { role: 'user' as const, content: userMessage },
            { role: 'assistant' as const, content: npcResponse }
        ]

        // Keep only last 100 messages to prevent bloat
        const trimmedHistory = updatedHistory.slice(-100)

        await saveCharacter({
            name: characterName,
            conversationHistory: trimmedHistory,
            lastInteractionAt: new Date(),
            timesSpokenTo: character.timesSpokenTo + 1
        }, db, bucket)
    } catch (error) {
        console.error('Error adding to character conversation:', error)
        throw new Error('Failed to update character conversation')
    }
}

export async function updateCharacterMood(
    characterName: string,
    newMood: RPGCharacter['mood'],
    relationshipChange: number = 0,
    db: D1Database,
    bucket: R2Bucket
): Promise<void> {
    try {
        const character = await getCharacter(characterName, db, bucket)
        if (!character) {
            console.warn('Tried to update mood of non-existent character:', characterName)
            return
        }

        const newRelationship = Math.max(-100, Math.min(100,
            character.relationshipLevel + relationshipChange
        ))

        await saveCharacter({
            name: characterName,
            mood: newMood,
            relationshipLevel: newRelationship
        }, db, bucket)

        console.log(`Updated ${characterName}: mood=${newMood}, relationship=${newRelationship}`)
    } catch (error) {
        console.error('Error updating character mood:', error)
        throw new Error('Failed to update character mood')
    }
}

export async function removeCharacterFromLocation(
    characterName: string,
    coordinates: Place['coordinates'],
    reason: string = 'The character has moved on.',
    db: D1Database,
    bucket: R2Bucket
): Promise<void> {
    try {
        await saveCharacter({
            name: characterName,
            hasLeft: true
        }, db, bucket)

        const { getPlaceId } = await import('../../utils/place-generator')
        const placeId = getPlaceId(coordinates)
        const placeRow = await db.prepare(
            'SELECT description FROM places WHERE id = ?'
        ).bind(placeId).first<any>()

        if (!placeRow) {
            console.warn('Tried to modify non-existent place:', placeId)
            return
        }

        let newDescription = placeRow.description
        const variations = [
            characterName,
            `the ${characterName}`,
            `a ${characterName}`,
            `an ${characterName}`
        ]

        variations.forEach(variation => {
            const pattern = new RegExp(`\\*\\*${variation}\\*\\*`, 'gi')
            newDescription = newDescription.replace(pattern, '')
        })

        newDescription = newDescription.replace(/\s{2,}/g, ' ')
        newDescription = newDescription.replace(/\s+([.,!?;:])/g, '$1')
        newDescription = newDescription.trim()

        if (reason) {
            newDescription = `${newDescription}\n\n${reason}`
        }

        await db.prepare(
            'UPDATE places SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(newDescription, placeId).run()

        console.log(`Removed ${characterName} from place ${placeId}`)
    } catch (error) {
        console.error('Error removing character from location:', error)
        throw new Error('Failed to remove character from location')
    }
}

export function getRelationshipDescription(relationshipLevel: number): string {
    if (relationshipLevel >= 75) return 'devoted ally'
    if (relationshipLevel >= 50) return 'close friend'
    if (relationshipLevel >= 25) return 'friendly acquaintance'
    if (relationshipLevel >= 10) return 'friendly'
    if (relationshipLevel >= -10) return 'neutral'
    if (relationshipLevel >= -25) return 'wary'
    if (relationshipLevel >= -50) return 'unfriendly'
    if (relationshipLevel >= -75) return 'hostile'
    return 'sworn enemy'
}

// ─── Generation helpers ────────────────────────────────────────────────────────

export async function generateCharacter(
    name: string,
    context: string,
    coordinates: GameState['coordinates'],
    openai: OpenAI,
    db: D1Database,
    bucket: R2Bucket
): Promise<RPGCharacter | null> {
    try {
        const completion = await openai.chat.completions.create({
            model: "llama-3.3-70b",
            messages: [
                {
                    role: "system",
                    content: `You are a creative writer generating details for NPCs in a text adventure game.
Generate a description and personality for the character based on their name and how they're mentioned in the game.
The response should be formatted exactly as shown in the example.

Example format:
Description: A weathered old hermit with piercing blue eyes and a long gray beard.
Personality: Wise and mysterious, speaks in riddles, but helpful to those who show respect.

Rules:
- Description should be one visual sentence focusing on appearance
- Personality should be one sentence describing behavior and demeanor
- Keep it concise and atmospheric
- Make them feel like they belong in a fantasy forest setting`
                },
                {
                    role: "user",
                    content: `Generate details for a character named "${name}" mentioned in this context: "${context}"`
                }
            ],
            temperature: 0.7,
            max_tokens: 150
        })

        const response = completion.choices[0]?.message?.content
        if (!response) throw new Error('Failed to generate character description')

        const descriptionMatch = response.match(/Description: (.+)/)
        const personalityMatch = response.match(/Personality: (.+)/)

        if (!descriptionMatch || !personalityMatch) {
            throw new Error('Invalid response format from AI')
        }

        const character: RPGCharacter = {
            name,
            description: descriptionMatch[1].trim(),
            personality: personalityMatch[1].trim(),
            locationNorth: coordinates.north,
            locationWest: coordinates.west,
            hasLeft: false,
            conversationHistory: [],
            relationshipLevel: 0,
            mood: 'neutral',
            questsGiven: [],
            itemsTraded: [],
            firstMetAt: new Date(),
            lastInteractionAt: new Date(),
            timesSpokenTo: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        }

        await saveCharacter(character, db, bucket)
        return character
    } catch (error) {
        console.error('Error generating character:', error)
        return null
    }
}

export async function processCharactersInText(
    text: string,
    coordinates: GameState['coordinates'],
    openai: OpenAI,
    db: D1Database,
    bucket?: R2Bucket
): Promise<{ processedText: string; characters: Record<string, RPGCharacter> }> {
    const characterMatches = text.match(/(?<!\*)\*\*(?!\*)(.*?)(?<!\*)\*\*(?!\*)/g)
    if (!characterMatches || !bucket) return { processedText: text, characters: {} }

    const characters: Record<string, RPGCharacter> = {}

    for (const characterMatch of characterMatches) {
        const characterName = characterMatch.replace(/^\*\*|\*\*$/g, '').trim()
        let character = await getCharacter(characterName, db, bucket)

        if (!character) {
            character = await generateCharacter(characterName, text, coordinates, openai, db, bucket)
        }

        if (character) {
            characters[characterName] = character
        }
    }

    return { processedText: text, characters }
}
