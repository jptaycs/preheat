import React, { createContext, useContext, useState } from 'react'

interface BadgeContextValue {
  alertBadge: number
  confirmBadge: number
  incAlertBadge: () => void
  clearAlertBadge: () => void
  setConfirmBadge: (n: number) => void
}

const BadgeContext = createContext<BadgeContextValue>({
  alertBadge: 0,
  confirmBadge: 0,
  incAlertBadge: () => {},
  clearAlertBadge: () => {},
  setConfirmBadge: () => {},
})

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const [alertBadge, setAlertBadge] = useState(0)
  const [confirmBadge, setConfirmBadge] = useState(0)

  return (
    <BadgeContext.Provider
      value={{
        alertBadge,
        confirmBadge,
        incAlertBadge: () => setAlertBadge((n) => n + 1),
        clearAlertBadge: () => setAlertBadge(0),
        setConfirmBadge,
      }}
    >
      {children}
    </BadgeContext.Provider>
  )
}

export function useBadge() {
  return useContext(BadgeContext)
}
