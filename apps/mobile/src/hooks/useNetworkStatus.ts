import { useEffect, useRef, useState, useCallback } from 'react'
import { AppState } from 'react-native'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const API_URL: string = (process.env.EXPO_PUBLIC_API_URL as string) ?? 'http://localhost:4000'
const HEALTH_URL = `${API_URL}/health`
const POLL_INTERVAL_MS = 30_000

export function useNetworkStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const check = useCallback(async () => {
    try {
      const res = await fetch(HEALTH_URL, { method: 'GET' })
      setIsOnline(res.ok)
    } catch {
      setIsOnline(false)
    }
  }, [])

  useEffect(() => {
    void check()

    intervalRef.current = setInterval(() => {
      void check()
    }, POLL_INTERVAL_MS)

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check()
    })

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      sub.remove()
    }
  }, [check])

  return { isOnline }
}
