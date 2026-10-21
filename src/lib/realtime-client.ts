"use client"

import { createRealtime } from "@upstash/realtime/client"
import { RealTimeEvents } from "./realtime"


export const { useRealtime } = createRealtime<RealTimeEvents>() 