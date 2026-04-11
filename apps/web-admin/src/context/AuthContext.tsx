import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi, saveTokens, clearTokens, getAccessToken, getRefreshToken } from '../lib/api'

interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      if (!getAccessToken() && !getRefreshToken()) {
        setIsLoading(false)
        return
      }
      try {
        const me = await authApi.me()
        setUser(me)
      } catch {
        clearTokens()
      } finally {
        setIsLoading(false)
      }
    }
    void restore()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login(email, password)
    saveTokens(tokens.accessToken, tokens.refreshToken)
    const me = await authApi.me()
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore — clear local state regardless
    }
    clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
