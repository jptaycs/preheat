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

export type LoginRole = 'pilot' | 'mechanic' | 'admin'

// Accounts that may sign in under each login-role choice
const ROLE_MATCHES: Record<LoginRole, string[]> = {
  pilot: ['pilot'],
  mechanic: ['mechanic', 'dispatcher'],
  admin: ['admin'],
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, asRole?: LoginRole) => Promise<void>
  register: (payload: {
    name: string
    email: string
    password: string
    licenseNumber?: string
  }) => Promise<void>
  logout: () => Promise<void>
  devLogin: (role: 'pilot' | 'mechanic' | 'admin') => Promise<void>
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

  const login = useCallback(async (email: string, password: string, asRole?: LoginRole) => {
    const { accessToken, refreshToken } = await authApi.login({ email, password })
    await storage.setTokens(accessToken, refreshToken)
    const me = await authApi.me()
    if (asRole && !ROLE_MATCHES[asRole].includes(me.role)) {
      await storage.clearTokens()
      throw new ApiError(
        403,
        `This account is registered as ${me.role}. Select the ${me.role === 'dispatcher' ? 'mechanic' : me.role} role to sign in.`,
      )
    }
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

  const devLogin = useCallback(async (role: 'pilot' | 'mechanic' | 'admin') => {
    const devUsers: Record<string, User> = {
      pilot: {
        id: 'dev-pilot-001',
        name: 'Dev Pilot',
        email: 'dev-pilot@preheat.local',
        role: 'pilot',
        licenseNumber: 'PPL-DEV-001',
      },
      mechanic: {
        id: 'dev-mechanic-001',
        name: 'Dev Mechanic',
        email: 'dev-mechanic@preheat.local',
        role: 'mechanic',
        licenseNumber: null,
      },
      admin: {
        id: 'dev-admin-001',
        name: 'Dev Admin',
        email: 'dev-admin@preheat.local',
        role: 'admin',
        licenseNumber: null,
      },
    }

    // Try real API first, fall back to offline dev user
    try {
      const creds = {
        pilot: { email: 'dev-pilot@preheat.local', password: 'devpilot123' },
        mechanic: { email: 'dev-mechanic@preheat.local', password: 'devmechanic123' },
        admin: { email: 'dev-admin@preheat.local', password: 'devadmin123' },
      }
      const { accessToken, refreshToken } = await authApi.login(creds[role])
      await storage.setTokens(accessToken, refreshToken)
      const me = await authApi.me()
      setUser(me)
    } catch (e) {
      console.warn('[devLogin] API unavailable — using offline dev user:', e)
      await storage.setTokens('dev-fake-access-token', 'dev-fake-refresh-token')
      setUser(devUsers[role])
    }
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
