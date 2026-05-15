import { useEffect, useRef, useCallback, useState } from 'react'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
const BASE_URL: string = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
  /^http/,
  'ws',
)
const WS_URL = `${BASE_URL}/ws`

const BACKOFF_BASE_MS = 3000
const BACKOFF_MAX_MS = 30000

type Handler = (data: unknown) => void

export function useWebSocket(onEvent: Record<string, Handler>): { isConnected: boolean } {
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(onEvent)
  const closedRef = useRef(false)
  const retryCountRef = useRef(0)
  const [isConnected, setIsConnected] = useState(false)
  handlersRef.current = onEvent

  const scheduleReconnect = useCallback(() => {
    if (closedRef.current) return
    const delay = Math.min(BACKOFF_BASE_MS * 2 ** retryCountRef.current, BACKOFF_MAX_MS)
    retryCountRef.current += 1
    setTimeout(connect, delay)
  }, [])

  const connect = useCallback(() => {
    if (closedRef.current) return
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        retryCountRef.current = 0
        setIsConnected(true)
      }

      ws.onmessage = (e) => {
        try {
          const { event, data } = JSON.parse(e.data as string) as { event: string; data: unknown }
          handlersRef.current[event]?.(data)
        } catch {
          /* ignore malformed messages */
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        scheduleReconnect()
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      scheduleReconnect()
    }
  }, [scheduleReconnect])

  useEffect(() => {
    closedRef.current = false
    retryCountRef.current = 0
    connect()
    return () => {
      closedRef.current = true
      wsRef.current?.close()
      setIsConnected(false)
    }
  }, [connect])

  return { isConnected }
}
