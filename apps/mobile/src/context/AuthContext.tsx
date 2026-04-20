import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi, ApiError } from '../lib/api'
import { storage } from '../lib/storage'

interface User {
  id: string
  name: string
  email: string
  role: string
  licenseNumber: string | null
  notificationPrefs?: {
    scheduleAlerts: boolean
    confirmReminder: boolean
    preheatProgress: boolean
    queueChanges: boolean
  }
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: {
    name: string
    email: string
    password: string
    licenseNumber?: string
  }) => Promise<void>
  logout: () => Promise<void>
  devLogin: (role: 'pilot' | 'mechanic') => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: restore session from SecureStore
  useEffect(() => {
    void (async () => {
      try {
        const token = await storage.getAccessToken()
        if (token) {
          const me = await authApi.me()
          setUser(me)
        }
      } catch {
        await storage.clearTokens()
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, refreshToken } = await authApi.login({ email, password })
    await storage.setTokens(accessToken, refreshToken)
    const me = await authApi.me()
    setUser(me)
  }, [])

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; licenseNumber?: string }) => {
      const { accessToken, refreshToken } = await authApi.register(payload)
      await storage.setTokens(accessToken, refreshToken)
      const me = await authApi.me()
      setUser(me)
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    await storage.clearTokens()
    setUser(null)
  }, [])

  const devLogin = useCallback((role: 'pilot' | 'mechanic') => {
    const creds = {
      pilot: { email: 'dev-pilot@preheat.local', password: 'devpilot123' },
      mechanic: { email: 'dev-mechanic@preheat.local', password: 'devmechanic123' },
    }
    void (async () => {
      try {
        const { accessToken, refreshToken } = await authApi.login(creds[role])
        await storage.setTokens(accessToken, refreshToken)
        const me = await authApi.me()
        setUser(me)
      } catch (e) {
        console.warn('[devLogin] failed — run pnpm db:seed in services/api first:', e)
      }
    })()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        devLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export { ApiError }
