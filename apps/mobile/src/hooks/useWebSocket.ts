import { useEffect, useRef, useCallback } from 'react'

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/^http/, 'ws')
const WS_URL = `${BASE_URL}/ws`

type Handler = (data: unknown) => void

export function useWebSocket(onEvent: Record<string, Handler>) {
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef(onEvent)
  handlersRef.current = onEvent

  const connect = useCallback(() => {
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
        // Reconnect after 3 seconds
        setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      setTimeout(connect, 3000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])
}
