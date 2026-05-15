import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { theme } from './theme'
import Login from './pages/Login'
import Privacy from './pages/Privacy'
import Queue from './pages/Queue'
import Track from './pages/Track'

// ── Guards ─────────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function LoadingScreen() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: theme.colors.bg,
        color: theme.colors.t2,
        fontSize: theme.fontSizes.md,
      }}
    >
      Loading…
    </div>
  )
}

// ── Header ─────────────────────────────────────────────────────────────────

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header
      style={{
        background: theme.colors.s1,
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: theme.fontSizes.lg,
          fontWeight: 800,
          color: theme.colors.blue,
          letterSpacing: '-0.3px',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/')}
      >
        AeroFluxPro{' '}
        <span style={{ color: theme.colors.t3, fontSize: theme.fontSizes.xs, fontWeight: 500 }}>
          Mechanic
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {user && (
          <span style={{ fontSize: theme.fontSizes.sm, color: theme.colors.t2 }}>
            {user.name}{' '}
            <span
              style={{
                background: `${theme.colors.blue}22`,
                color: theme.colors.blue,
                fontSize: theme.fontSizes.xs,
                padding: '2px 8px',
                borderRadius: 99,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {user.role}
            </span>
          </span>
        )}
        <button
          onClick={() => {
            void logout().then(() => navigate('/login'))
          }}
          style={{
            padding: '6px 14px',
            background: 'transparent',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            color: theme.colors.t2,
            fontSize: theme.fontSizes.xs,
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

// ── Shell ──────────────────────────────────────────────────────────────────

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: theme.colors.bg }}>
      <Header />
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>{children}</main>
    </div>
  )
}

// ── Routes ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <Queue />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/track/:requestId"
        element={
          <ProtectedRoute>
            <AppShell>
              <Track />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
