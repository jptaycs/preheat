import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import { darkColors, lightColors } from '../theme'
import type { ThemeColors } from '../theme'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'preheat_theme_mode'

interface ThemeContextValue {
  mode: ThemeMode
  colors: ThemeColors
  isLight: boolean
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    void (async () => {
      const saved = await SecureStore.getItemAsync(THEME_KEY)
      if (saved === 'light' || saved === 'dark') {
        setModeState(saved)
      }
    })()
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    void SecureStore.setItemAsync(THEME_KEY, next)
  }, [])

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      void SecureStore.setItemAsync(THEME_KEY, next)
      return next
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: mode === 'light' ? lightColors : darkColors,
      isLight: mode === 'light',
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
