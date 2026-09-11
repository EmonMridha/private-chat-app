import { redis } from '@/lib/redis'
import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'

const ROOM_TTL_SECONDS = 60 * 10

const rooms = new Elysia({ prefix: '/room' })

    .post('/create', async () => {
        const roomId = nanoid() // creating a roomId

        // Storing data in redis under a meta
        await redis.hset(`meta:${roomId}`, {
            connected: ['Emon'],
            createdAt: Date.now(),
        })

        // deleting the room after 10 minutes
        await redis.expire(`meta: ${roomId}`, ROOM_TTL_SECONDS)

        return { roomId }
    })

const app = new Elysia({ prefix: '/api' }).use(rooms)

export const GET = app.fetch
export const POST = app.fetch

export type App = typeof app