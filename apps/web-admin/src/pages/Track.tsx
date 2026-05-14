import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { SessionDetail } from '../lib/api'
import { sessionsApi } from '../lib/api'
import { onWsEvent } from '../lib/ws'
import { theme } from '../theme'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function elapsed(startedAt: string): string {
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Heat gauge (web version) ───────────────────────────────────────────────

function HeatGauge({ tempC, readingCount }: { tempC: number | null; readingCount: number }) {
  return (
    <div
      style={{
        background: theme.colors.s1,
        border: `1.5px solid ${theme.colors.orange}`,
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
        textAlign: 'center',
        boxShadow: `0 0 24px ${theme.colors.orange}18`,
      }}
    >
      {/* Status pill */}
      <div style={{ marginBottom: 20 }}>
        <span
          style={{
            background: `${theme.colors.orange}22`,
            color: theme.colors.orange,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '4px 12px',
            borderRadius: 99,
            border: `1px solid ${theme.colors.orange}44`,
          }}
        >
          ● Preheating In Progress
        </span>
      </div>

      {/* Gauge ring */}
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: '50%',
          border: `5px solid ${theme.colors.orange}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}
      >
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: '50%',
            border: `3px solid ${theme.colors.orange}66`,
            background: theme.colors.s2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: theme.colors.orange,
              lineHeight: 1,
            }}
          >
            {tempC !== null ? `${Number(tempC).toFixed(0)}°C` : '--'}
          </div>
          <div style={{ fontSize: 11, color: theme.colors.t2, marginTop: 4 }}>current</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40 }}>
        <div>
          <div
            style={{
              fontSize: 10,
              color: theme.colors.t3,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 2,
            }}
          >
            Current
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: theme.colors.orange }}>
            {tempC !== null ? `${Number(tempC).toFixed(0)}°C` : '--'}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              color: theme.colors.t3,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 2,
            }}
          >
            Target
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: theme.colors.text }}>+5°C</div>
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              color: theme.colors.t3,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 2,
            }}
          >
            Readings
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: theme.colors.blue }}>
            {readingCount}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Timeline ───────────────────────────────────────────────────────────────

function Timeline({ session }: { session: SessionDetail }) {
  const readings = [...session.readings].reverse()
  return (
    <div
      style={{
        background: theme.colors.s1,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 16,
        padding: 20,
        marginTop: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: theme.colors.t3,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 16,
        }}
      >
        Progress Timeline
      </div>

      <TimelineItem
        time={fmt(session.startedAt)}
        title="Session Started"
        sub="Preheat initiated"
        color={theme.colors.green}
        badge="Done"
      />

      {readings.map((r, i) => (
        <TimelineItem
          key={r.id}
          time={fmt(r.recordedAt)}
          title={`Temperature: ${Number(r.tempCelsius).toFixed(1)}°C`}
          sub={`Reading ${session.readings.length - i}`}
          color={i === 0 ? theme.colors.orange : theme.colors.border}
          badge={i === 0 ? 'Latest' : undefined}
          badgeColor={i === 0 ? theme.colors.orange : undefined}
        />
      ))}

      {session.completedAt ? (
        <TimelineItem
          time={fmt(session.completedAt)}
          title="Preheat Complete"
          sub="Aircraft ready for departure"
          color={theme.colors.green}
          badge="Done"
          last
        />
      ) : (
        <TimelineItem
          time="Pending"
          title="Preheat Complete"
          sub="Aircraft ready for departure"
          color={theme.colors.border}
          dim
          last
        />
      )}
    </div>
  )
}

function TimelineItem({
  time,
  title,
  sub,
  color,
  badge,
  badgeColor,
  dim,
  last,
}: {
  time: string
  title: string
  sub: string
  color: string
  badge?: string
  badgeColor?: string
  dim?: boolean
  last?: boolean
}) {
  const bc = badgeColor ?? (badge === 'Done' ? theme.colors.green : theme.colors.t3)
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: last ? 0 : 16 }}>
      {/* Dot + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: `2.5px solid ${color}`,
            background: dim ? theme.colors.bg : color,
            flexShrink: 0,
            marginTop: 2,
          }}
        />
        {!last && (
          <div
            style={{
              width: 2,
              flex: 1,
              background: color,
              minHeight: 12,
              marginTop: 3,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: last ? 0 : 4 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: theme.colors.t2,
            marginBottom: 4,
          }}
        >
          {time}
        </div>
        <div
          style={{
            background: theme.colors.s2,
            border: `1px solid ${dim ? theme.colors.border : color + '55'}`,
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: dim ? theme.colors.t3 : theme.colors.text,
              }}
            >
              {title}
            </span>
            {badge && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: bc,
                  background: `${bc}22`,
                  padding: '2px 8px',
                  borderRadius: 99,
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: theme.colors.t2 }}>{sub}</div>
        </div>
      </div>
    </div>
  )
}

// ── Main track screen ──────────────────────────────────────────────────────

export default function Track() {
  const { requestId } = useParams<{ requestId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const tailNumber = searchParams.get('tail') ?? ''
  const aircraftType = searchParams.get('aircraft') ?? ''
  const pilotName = searchParams.get('pilot') ?? ''

  const [session, setSession] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tempInput, setTempInput] = useState('')
  const [starting, setStarting] = useState(false)
  const [logging, setLogging] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [elapsed_, setElapsed] = useState('0:00')
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchSession = useCallback(async () => {
    if (!requestId) return
    try {
      setError(null)
      const sess = await sessionsApi.getByRequest(requestId)
      if (isMounted.current) setSession(sess)
    } catch (e: unknown) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404) {
        if (isMounted.current) setSession(null)
      } else {
        if (isMounted.current) setError(e instanceof Error ? e.message : 'Failed to load session')
      }
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    void fetchSession()
  }, [fetchSession])

  // Polling fallback
  useEffect(() => {
    if (session?.completedAt) return
    const interval = setInterval(() => void fetchSession(), 5000)
    return () => clearInterval(interval)
  }, [fetchSession, session?.completedAt])

  // WebSocket events
  useEffect(() => {
    const unsubs = [
      onWsEvent('temp.updated', () => void fetchSession()),
      onWsEvent('session.completed', () => void fetchSession()),
      onWsEvent('session.started', () => void fetchSession()),
    ]
    return () => unsubs.forEach((u) => u())
  }, [fetchSession])

  // Elapsed timer
  useEffect(() => {
    if (!session?.startedAt || session.completedAt) return
    const tick = () => setElapsed(elapsed(session.startedAt))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session?.startedAt, session?.completedAt])

  const handleStart = async () => {
    if (!requestId) return
    setStarting(true)
    try {
      await sessionsApi.start(requestId)
      await fetchSession()
    } catch (e) {
      if (isMounted.current) setError(e instanceof Error ? e.message : 'Failed to start')
    } finally {
      if (isMounted.current) setStarting(false)
    }
  }

  const handleLogTemp = async () => {
    const temp = parseFloat(tempInput)
    if (isNaN(temp) || temp < -60 || temp > 60) {
      setError('Enter a valid temperature between -60 and 60°C')
      return
    }
    if (!session) return
    setLogging(true)
    try {
      await sessionsApi.addReading(session.id, temp)
      if (isMounted.current) setTempInput('')
      await fetchSession()
    } catch (e) {
      if (isMounted.current) setError(e instanceof Error ? e.message : 'Failed to log temp')
    } finally {
      if (isMounted.current) setLogging(false)
    }
  }

  const handleComplete = async () => {
    if (!session) return
    setCompleting(true)
    try {
      await sessionsApi.complete(session.id)
      await fetchSession()
    } catch (e) {
      if (isMounted.current) setError(e instanceof Error ? e.message : 'Failed to complete')
    } finally {
      if (isMounted.current) setCompleting(false)
    }
  }

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'transparent',
          border: 'none',
          color: theme.colors.t2,
          fontSize: theme.fontSizes.sm,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        ← Queue
      </button>

      {/* Aircraft info card */}
      <div
        style={{
          background: theme.colors.s1,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: theme.fontSizes.xl, fontWeight: 800, color: theme.colors.text }}>
          {tailNumber}
        </div>
        {aircraftType && (
          <div style={{ fontSize: theme.fontSizes.sm, color: theme.colors.t2, marginTop: 2 }}>
            {aircraftType}
          </div>
        )}
        {pilotName && (
          <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.t3, marginTop: 4 }}>
            Pilot: {pilotName}
          </div>
        )}
        {session?.startedAt && !session.completedAt && (
          <div
            style={{
              marginTop: 10,
              fontSize: theme.fontSizes.xs,
              color: theme.colors.orange,
              fontWeight: 700,
            }}
          >
            ⏱ Elapsed: {elapsed_}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: `${theme.colors.red}22`,
            border: `1px solid ${theme.colors.red}44`,
            borderRadius: 12,
            padding: 14,
            color: theme.colors.red,
            fontSize: theme.fontSizes.sm,
            marginBottom: 16,
            cursor: 'pointer',
          }}
          onClick={() => setError(null)}
        >
          {error} · <span style={{ textDecoration: 'underline' }}>Dismiss</span>
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: theme.colors.t2,
            fontSize: theme.fontSizes.sm,
          }}
        >
          Loading…
        </div>
      ) : session?.completedAt ? (
        /* Completed */
        <>
          <div
            style={{
              background: `${theme.colors.green}18`,
              border: `1px solid ${theme.colors.green}66`,
              borderRadius: 20,
              padding: 32,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div
              style={{
                fontSize: theme.fontSizes.xl,
                fontWeight: 800,
                color: theme.colors.green,
                marginBottom: 8,
              }}
            >
              Preheat Complete!
            </div>
            <div style={{ fontSize: theme.fontSizes.sm, color: theme.colors.text }}>
              {tailNumber} is ready for the pilot.
            </div>
          </div>
          <Timeline session={session} />
        </>
      ) : session ? (
        /* Active session */
        <>
          <HeatGauge tempC={session.currentTempCelsius} readingCount={session.readings.length} />

          {/* Temp input */}
          <div
            style={{
              background: theme.colors.s1,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 16,
              padding: 20,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: theme.colors.t2,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 12,
              }}
            >
              Log Temperature Reading
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="number"
                value={tempInput}
                onChange={(e) => setTempInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleLogTemp()
                }}
                placeholder="-20.5"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: theme.colors.s2,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: 10,
                  color: theme.colors.text,
                  fontSize: theme.fontSizes.md,
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
              <span style={{ color: theme.colors.t2, fontWeight: 600 }}>°C</span>
              <button
                disabled={logging || !tempInput}
                onClick={() => void handleLogTemp()}
                style={{
                  padding: '12px 24px',
                  background: theme.colors.blue,
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: theme.fontSizes.sm,
                  cursor: logging || !tempInput ? 'not-allowed' : 'pointer',
                  opacity: logging || !tempInput ? 0.5 : 1,
                }}
              >
                {logging ? '…' : 'Log'}
              </button>
            </div>
          </div>

          {/* Complete button */}
          <button
            disabled={completing}
            onClick={() => void handleComplete()}
            style={{
              width: '100%',
              padding: '14px',
              background: theme.colors.green,
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontWeight: 800,
              fontSize: theme.fontSizes.md,
              cursor: completing ? 'not-allowed' : 'pointer',
              opacity: completing ? 0.5 : 1,
              marginBottom: 16,
            }}
          >
            {completing ? 'Completing…' : '✓ Complete Session'}
          </button>

          {session.readings.length > 0 && <Timeline session={session} />}
        </>
      ) : (
        /* No session yet */
        <div
          style={{
            background: theme.colors.s1,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 20,
            padding: 40,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
          <div
            style={{
              fontSize: theme.fontSizes.lg,
              fontWeight: 700,
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            Ready to Preheat
          </div>
          <div
            style={{
              fontSize: theme.fontSizes.sm,
              color: theme.colors.t2,
              marginBottom: 28,
            }}
          >
            {tailNumber} is confirmed. Tap Start when you're at the aircraft.
          </div>
          <button
            disabled={starting}
            onClick={() => void handleStart()}
            style={{
              padding: '14px 36px',
              background: theme.colors.orange,
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontWeight: 800,
              fontSize: theme.fontSizes.md,
              cursor: starting ? 'not-allowed' : 'pointer',
              opacity: starting ? 0.5 : 1,
            }}
          >
            {starting ? 'Starting…' : 'Start Preheat'}
          </button>
        </div>
      )}
    </div>
  )
}
