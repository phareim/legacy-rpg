import type { H3Event } from 'h3'

export function getBucket(event: H3Event): R2Bucket {
    const env = (event.context as any).cloudflare?.env
    if (!env?.BUCKET) throw new Error('R2 binding not available')
    return env.BUCKET as R2Bucket
}

export async function getR2Json<T>(bucket: R2Bucket, key: string): Promise<T | null> {
    try {
        const obj = await bucket.get(key)
        if (!obj) return null
        return await obj.json<T>()
    } catch {
        return null
    }
}

export async function putR2Json(bucket: R2Bucket, key: string, data: unknown): Promise<void> {
    await bucket.put(key, JSON.stringify(data), {
        httpMetadata: { contentType: 'application/json' }
    })
}
