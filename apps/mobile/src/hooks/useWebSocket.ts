import { useEffect, useRef, useCallback } from 'react'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
const BASE_URL: string = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
  /^http/,
  'ws',
)
const WS_URL = `${BASE_URL}/ws`

type Handler = (data: unknown) => void

export function useWebSocket(onEvent: Record<string, Handler>) {
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(onEvent)
  const closedRef = useRef(false)
  handlersRef.current = onEvent

  const connect = useCallback(() => {
    if (closedRef.current) return
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onmessage = (e) => {
        try {
          const { event, data } = JSON.parse(e.data as string) as { event: string; data: unknown }
          handlersRef.current[event]?.(data)
        } catch {
          /* ignore malformed messages */
        }
      }

      ws.onclose = () => {
        if (!closedRef.current) setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      if (!closedRef.current) setTimeout(connect, 3000)
    }
  }, [])

  useEffect(() => {
    closedRef.current = false
    connect()
    return () => {
      closedRef.current = true
      wsRef.current?.close()
    }
  }, [connect])
}
