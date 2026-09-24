import { NextRequest, NextResponse } from "next/server"
import { redis } from "./lib/redis"
import { nanoid } from "nanoid"


export const proxy = async (req: NextRequest) => {

    const pathname = req.nextUrl.pathname // the url user is trying to access

    const roomMatch = pathname.match(/^\/room\/([^/]+$)/)

    if (!roomMatch) return NextResponse.redirect(new URL('/', req.url))

    const roomId = roomMatch[1]

    // getting the meta data from redis under roomId
    const meta = await redis.hgetall<{
        connected: string[];
        createAt: number
    }>(`meta:${roomId}`)

    if (!meta) {
        return NextResponse.redirect(new URL('/?error=room-not-found', req.url))
    }

    const existingToken = req.cookies.get('x-auth-token')?.value // getting the token from the cookie if it exists

    // User is allowed to join room
    if (existingToken && meta.connected.includes(existingToken)) {
        return NextResponse.next()
    }

    if (meta.connected.length >= 2) {
        return NextResponse.redirect(new URL('/?error=room-full', req.url))
    }

    const response = NextResponse.next()

    const token = nanoid()

    // setting new token in cookie
    response.cookies.set('x-auth-token', token,
        {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        }
    )

    await redis.hset(`meta:${roomId}`, {
        connected: [...meta.connected, token]
    })
    return response
    // Overview: Check if user is allowed to join room.  If they are let them pass
    // If they are: Let them pass
    // If they are not: Send them back to lobby
}

export const config = {
    matcher: "/room/:path*"
}