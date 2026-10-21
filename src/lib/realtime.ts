import { InferRealtimeEvents, Realtime } from "@upstash/realtime";
import { redis } from '@/lib/redis'
import z from "zod";

const message = z.object({
    id: z.string(),
    sender: z.string(),
    text: z.string(),
    timeStamp: z.number(),
    roomId: z.string(),
    token: z.string().optional()
})

const schema = {
    chat: {
        message,
        destroy: z.object({
            isDestroyed: z.literal(true)
        })
    }
}

export const realtime = new Realtime({ schema, redis })

export type RealTimeEvents = InferRealtimeEvents<typeof realtime>

export type Message = z.infer<typeof message>