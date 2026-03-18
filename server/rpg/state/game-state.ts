import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { SYSTEM_PROMPT } from '../handlers/ai'
import { getR2Json, putR2Json } from '../../utils/r2'

// Game state interface
export interface GameState {
    coordinates: {
        north: number;
        west: number;
    };
    inventory: string[];
    visited: string[];
    lastUpdated: Date;
    messages: ChatCompletionMessageParam[];
    currentPlace?: {
        name: string;
        description: string;
    };
}

// Game's initial state
export const DEFAULT_GAME_STATE: GameState = {
    coordinates: { north: 0, west: 0 },
    inventory: [],
    visited: [],
    lastUpdated: new Date(),
    messages: [SYSTEM_PROMPT]
}

export async function loadGameState(userId: string, db: D1Database, bucket: R2Bucket): Promise<GameState | null> {
    try {
        const row = await db.prepare(
            'SELECT * FROM game_states WHERE user_id = ?'
        ).bind(userId).first<any>()

        if (!row) {
            const newState: GameState = { ...DEFAULT_GAME_STATE, visited: ['0,0'] }
            await saveGameState(userId, newState, db, bucket)
            return newState
        }

        // Read large blobs from R2 in parallel
        const [messages, inventory, visited] = await Promise.all([
            getR2Json<ChatCompletionMessageParam[]>(bucket, `game-states/${userId}/messages.json`),
            getR2Json<string[]>(bucket, `game-states/${userId}/inventory.json`),
            getR2Json<string[]>(bucket, `game-states/${userId}/visited.json`)
        ])

        return {
            coordinates: {
                north: row.coordinates_north,
                west: row.coordinates_west
            },
            inventory: inventory || [],
            visited: visited || [],
            lastUpdated: new Date(row.last_updated),
            messages: messages || [SYSTEM_PROMPT],
            currentPlace: row.current_place_name ? {
                name: row.current_place_name,
                description: row.current_place_description || ''
            } : undefined
        }
    } catch (error) {
        console.error('Error loading game state:', error)
        return null
    }
}

export async function saveGameState(userId: string, state: GameState, db: D1Database, bucket: R2Bucket): Promise<void> {
    try {
        // Write D1 (slim row) and R2 (blobs) in parallel
        await Promise.all([
            db.prepare(`
                INSERT OR REPLACE INTO game_states (
                    user_id, coordinates_north, coordinates_west,
                    current_place_name, current_place_description,
                    last_updated
                ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).bind(
                userId,
                state.coordinates.north,
                state.coordinates.west,
                state.currentPlace?.name ?? null,
                state.currentPlace?.description ?? null
            ).run(),
            putR2Json(bucket, `game-states/${userId}/messages.json`, state.messages),
            putR2Json(bucket, `game-states/${userId}/inventory.json`, state.inventory),
            putR2Json(bucket, `game-states/${userId}/visited.json`, state.visited)
        ])
    } catch (error) {
        console.error('Error saving game state:', error)
        throw new Error('Failed to save game state to database')
    }
}
