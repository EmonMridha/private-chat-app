import { redis } from '@/lib/redis'
import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'
import { authMiddleware } from './auth'
import { z } from 'zod'
import { Message, realtime } from '@/lib/realtime'

const ROOM_TTL_SECONDS = 60 * 10

const rooms = new Elysia({ prefix: '/room' }).post('/create', async () => {
    const roomId = nanoid() // creating a roomId

    // Creating a new room in redis under a meta
    await redis.hset(`meta:${roomId}`, {
        connected: [],
        createdAt: Date.now()
    })

    // deleting the room after 10 minutes
    await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS)

    return { roomId }
})

const messages = new Elysia({ prefix: "/messages" }).use(authMiddleware).post('/', async ({ body, auth }) => {

    const { sender, text } = body
    const { roomId } = auth

    console.log("Room ID:", roomId)

    const roomExists = await redis.exists(`meta:${roomId}`)

    console.log("Room exists:", roomExists)

    if (!roomExists) {
        throw new Error("Room Does not exists")
    }

    const message: Message = {
        id: nanoid(),
        sender,
        text,
        timeStamp: Date.now(),
        roomId,
    }

    // add message to redis
    const result = await redis.rpush(`messages:${roomId}`, {
        ...message,
        token: auth.token
    })

    console.log("Message added to Redis:", result)

    await realtime.channel(roomId).emit('chat.message', message)

    // housekeeping
    const remaining = await redis.ttl(`meta:${roomId}`)

    await redis.expire(`messages:${roomId}`, remaining)
    await redis.expire(`history:${roomId}`, remaining)
    await redis.expire(roomId, remaining)
},
    {
        query: z.object({ roomId: z.string() }),
        body: z.object({
            sender: z.string().max(100),
            text: z.string().max(1000)
        })
    })

const app = new Elysia({ prefix: '/api' }).use(rooms).use(messages)

export const GET = app.fetch
export const POST = app.fetch

export type App = typeof app