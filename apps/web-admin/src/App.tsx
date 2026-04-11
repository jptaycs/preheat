import React from 'react'
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { theme } from './theme'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Queue from './pages/Queue'
import Users from './pages/Users'
import Settings from './pages/Settings'

// ── Guards ─────────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleGuard({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />
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

// ── Sidebar nav ────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', exact: true },
  { to: '/queue', label: 'Queue' },
  { to: '/users', label: 'Users' },
  { to: '/settings', label: 'Settings' },
]

function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      style={{
        width: 220,
        minHeight: '100vh',
        background: theme.colors.s1,
        borderRight: `1px solid ${theme.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: `${theme.spacing.lg} 0`,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: `0 ${theme.spacing.lg} ${theme.spacing.lg}`,
          borderBottom: `1px solid ${theme.colors.border}`,
          marginBottom: theme.spacing.md,
        }}
      >
        <div style={{ fontSize: theme.fontSizes.lg, fontWeight: 700, color: theme.colors.blue }}>
          AeroFluxPro
        </div>
        <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.t2, marginTop: 2 }}>
          Dispatcher Panel
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            style={({ isActive }) => ({
              display: 'block',
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              color: isActive ? theme.colors.blue : theme.colors.text,
              textDecoration: 'none',
              fontSize: theme.fontSizes.sm,
              fontWeight: isActive ? 600 : 400,
              background: isActive ? `${theme.colors.blue}18` : 'transparent',
              borderLeft: isActive ? `3px solid ${theme.colors.blue}` : '3px solid transparent',
              transition: 'all 0.15s',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div
        style={{
          padding: `${theme.spacing.md} ${theme.spacing.lg} 0`,
          borderTop: `1px solid ${theme.colors.border}`,
        }}
      >
        {user && (
          <div style={{ marginBottom: theme.spacing.sm }}>
            <div
              style={{ fontSize: theme.fontSizes.sm, color: theme.colors.text, fontWeight: 600 }}
            >
              {user.name}
            </div>
            <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.t2 }}>{user.role}</div>
          </div>
        )}
        <button
          onClick={() => {
            void handleLogout()
          }}
          style={{
            width: '100%',
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            background: 'transparent',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.sm,
            color: theme.colors.t2,
            fontSize: theme.fontSizes.xs,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

// ── Shell layout (with sidebar) ────────────────────────────────────────────

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme.colors.bg }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  )
}

// ── Routes ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell>
              <Dashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/queue"
        element={
          <ProtectedRoute>
            <AppShell>
              <Queue />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <RoleGuard roles={['dispatcher', 'admin']}>
              <AppShell>
                <Users />
              </AppShell>
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppShell>
              <Settings />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
