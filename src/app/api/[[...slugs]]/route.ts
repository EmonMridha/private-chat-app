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

// things sent from frontend are set in req.body and things returned from authMiddleware are set in req.auth
const messages = new Elysia({ prefix: "/messages" }).use(authMiddleware).post('/', async (req) => {

    const { sender, text } = req.body
    const { roomId } = req.auth

    const roomExists = await redis.exists(`meta:${roomId}`)

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
        token: req.auth.token
    })

    await realtime.channel(roomId).emit('chat.message', message)

    // housekeeping
    const remaining = await redis.ttl(`meta:${roomId}`) // getting the remaining time of the room in seconds

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
    }).get('/', async (req) => {

        const auth = req.auth // getting the auth from authMiddleware
        const messages = await redis.lrange<Message>(`messages:${auth.roomId}`, 0, -1) // getting all the messages of the room from redis

        return { messages: messages.map((m) => ({ ...m, token: m.token === auth.token ? auth.token : undefined })) }
    }, { query: z.object({ roomId: z.string() }) })

const app = new Elysia({ prefix: '/api' }).use(rooms).use(messages)

export const GET = app.fetch
export const POST = app.fetch

export type App = typeof app