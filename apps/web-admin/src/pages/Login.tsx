import type { FormEvent } from 'react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { theme } from '../theme'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const quickLogin = async (devEmail: string, devPassword: string) => {
    setError(null)
    setIsSubmitting(true)
    try {
      await login(devEmail, devPassword)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Already logged in → redirect
  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    background: theme.colors.s2,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.text,
    fontSize: theme.fontSizes.md,
    outline: 'none',
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: theme.colors.bg,
        padding: theme.spacing.lg,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: theme.spacing.xxl }}>
          <div
            style={{
              fontSize: theme.fontSizes.xxl,
              fontWeight: 800,
              color: theme.colors.blue,
              letterSpacing: '-0.5px',
            }}
          >
            AeroFluxPro
          </div>
          <div style={{ color: theme.colors.t2, fontSize: theme.fontSizes.sm, marginTop: 4 }}>
            Mechanic Panel
          </div>
        </div>

        {/* Dev shortcuts */}
        {(import.meta.env as { DEV?: boolean }).DEV && (
          <div
            style={{
              marginBottom: theme.spacing.lg,
              padding: theme.spacing.md,
              background: `${theme.colors.orange}14`,
              border: `1px solid ${theme.colors.orange}44`,
              borderRadius: theme.radius.md,
            }}
          >
            <div
              style={{
                fontSize: theme.fontSizes.xs,
                fontWeight: 700,
                color: theme.colors.orange,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: theme.spacing.sm,
              }}
            >
              Dev Shortcuts
            </div>
            <div style={{ display: 'flex', gap: theme.spacing.sm }}>
              {[
                {
                  label: 'Mechanic',
                  email: 'dev-mechanic@preheat.local',
                  password: 'devmechanic123',
                },
                { label: 'Pilot', email: 'dev-pilot@preheat.local', password: 'devpilot123' },
              ].map(({ label, email, password }) => (
                <button
                  key={label}
                  disabled={isSubmitting}
                  onClick={() => void quickLogin(email, password)}
                  style={{
                    padding: '6px 16px',
                    background: theme.colors.s2,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.sm,
                    color: theme.colors.text,
                    fontSize: theme.fontSizes.sm,
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Card */}
        <div
          style={{
            background: theme.colors.s1,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.xl,
          }}
        >
          <h1
            style={{
              fontSize: theme.fontSizes.lg,
              fontWeight: 700,
              color: theme.colors.text,
              marginBottom: theme.spacing.xl,
            }}
          >
            Sign in
          </h1>

          <form
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
          >
            {/* Email */}
            <div style={{ marginBottom: theme.spacing.md }}>
              <label
                style={{
                  display: 'block',
                  fontSize: theme.fontSizes.xs,
                  color: theme.colors.t2,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: theme.spacing.xs,
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="mechanic@example.com"
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: theme.spacing.lg }}>
              <label
                style={{
                  display: 'block',
                  fontSize: theme.fontSizes.xs,
                  color: theme.colors.t2,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: theme.spacing.xs,
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: `${theme.colors.red}22`,
                  border: `1px solid ${theme.colors.red}66`,
                  borderRadius: theme.radius.sm,
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  color: theme.colors.red,
                  fontSize: theme.fontSizes.sm,
                  marginBottom: theme.spacing.md,
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: theme.spacing.md,
                background: isSubmitting ? theme.colors.t3 : theme.colors.blue,
                border: 'none',
                borderRadius: theme.radius.md,
                color: '#fff',
                fontSize: theme.fontSizes.md,
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
