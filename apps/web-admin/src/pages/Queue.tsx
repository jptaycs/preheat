import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { QueueEntry, QueueResponse } from '../lib/api'
import { queueApi, sessionsApi } from '../lib/api'
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

const STATUS_COLOR: Record<string, string> = {
  waiting: theme.colors.yellow,
  confirmed: theme.colors.blue,
  active: theme.colors.orange,
  completed: theme.colors.green,
  cancelled: theme.colors.t3,
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? theme.colors.t2
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 99,
        background: `${color}22`,
        border: `1px solid ${color}66`,
        color,
        fontSize: theme.fontSizes.xs,
        fontWeight: 700,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  )
}

// ── Queue card ─────────────────────────────────────────────────────────────

function QueueCard({ entry, onRefresh }: { entry: QueueEntry; onRefresh: () => void }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const startPreheat = async () => {
    setBusy(true)
    setErr(null)
    try {
      await sessionsApi.start(entry.id)
      onRefresh()
      navigate(
        `/track/${entry.id}?tail=${entry.tailNumber}&aircraft=${entry.aircraftType}&pilot=${entry.pilotFirstName}`,
      )
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to start')
      setBusy(false)
    }
  }

  const isActive = entry.status === 'active'
  const isConfirmed = entry.status === 'confirmed'

  return (
    <div
      style={{
        background: theme.colors.s1,
        border: `1px solid ${isActive ? theme.colors.orange + '66' : theme.colors.border}`,
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        boxShadow: isActive ? `0 0 16px ${theme.colors.orange}18` : 'none',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontSize: theme.fontSizes.xl,
              fontWeight: 800,
              color: theme.colors.text,
              letterSpacing: '-0.5px',
            }}
          >
            {entry.tailNumber}
          </div>
          <div style={{ fontSize: theme.fontSizes.sm, color: theme.colors.t2, marginTop: 2 }}>
            {entry.aircraftType} · Pilot: {entry.pilotFirstName}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: theme.fontSizes.xs, color: theme.colors.t3 }}>
            #{entry.queuePosition}
          </span>
          <StatusBadge status={entry.status} />
        </div>
      </div>

      {/* Time row */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${theme.colors.border}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: theme.colors.t3,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
              marginBottom: 2,
            }}
          >
            Engine Start
          </div>
          <div style={{ fontSize: theme.fontSizes.md, fontWeight: 700, color: theme.colors.text }}>
            {fmt(entry.engineStartTime)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              color: theme.colors.t3,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
              marginBottom: 2,
            }}
          >
            Assigned
          </div>
          <div style={{ fontSize: theme.fontSizes.md, fontWeight: 700, color: theme.colors.text }}>
            {fmt(entry.assignedTime)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              color: theme.colors.t3,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
              marginBottom: 2,
            }}
          >
            Confirm Window
          </div>
          <div style={{ fontSize: theme.fontSizes.sm, color: theme.colors.t2 }}>
            {fmt(entry.confirmOpensAt)} – {fmt(entry.confirmDeadline)}
          </div>
        </div>
      </div>

      {/* Notes */}
      {entry.notes && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            background: `${theme.colors.yellow}14`,
            border: `1px solid ${theme.colors.yellow}44`,
            borderRadius: 8,
            fontSize: theme.fontSizes.xs,
            color: theme.colors.t2,
          }}
        >
          <span style={{ fontWeight: 700, color: theme.colors.yellow, marginRight: 6 }}>Note:</span>
          {entry.notes}
        </div>
      )}

      {/* Actions */}
      {(isConfirmed || isActive) && (
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          {isConfirmed && (
            <button
              disabled={busy}
              onClick={() => void startPreheat()}
              style={{
                padding: '10px 22px',
                background: theme.colors.orange,
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontWeight: 700,
                fontSize: theme.fontSizes.sm,
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? 'Starting…' : 'Start Preheat'}
            </button>
          )}
          {isActive && (
            <button
              onClick={() =>
                navigate(
                  `/track/${entry.id}?tail=${entry.tailNumber}&aircraft=${entry.aircraftType}&pilot=${entry.pilotFirstName}`,
                )
              }
              style={{
                padding: '10px 22px',
                background: theme.colors.blue,
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontWeight: 700,
                fontSize: theme.fontSizes.sm,
                cursor: 'pointer',
              }}
            >
              Track →
            </button>
          )}
        </div>
      )}

      {err && (
        <div
          style={{
            marginTop: 10,
            color: theme.colors.red,
            fontSize: theme.fontSizes.xs,
          }}
        >
          {err}
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function todayLocal(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function Queue() {
  const [date, setDate] = useState<string>(todayLocal)
  const [data, setData] = useState<QueueResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await queueApi.get(date)
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    const unsubs = [
      onWsEvent('queue.updated', () => void load()),
      onWsEvent('session.started', () => void load()),
      onWsEvent('session.completed', () => void load()),
    ]
    return () => unsubs.forEach((u) => u())
  }, [load])

  // Polling fallback
  useEffect(() => {
    const interval = setInterval(() => void load(), 5000)
    return () => clearInterval(interval)
  }, [load])

  const entries = data?.entries ?? []
  const active = entries.filter((e) => e.status === 'active')
  const confirmed = entries.filter((e) => e.status === 'confirmed')
  const waiting = entries.filter((e) => e.status === 'waiting')
  const completed = entries.filter((e) => e.status === 'completed')

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: theme.fontSizes.xl,
              fontWeight: 800,
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            Queue
          </h1>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: '6px 12px',
              background: theme.colors.s2,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 8,
              color: theme.colors.text,
              fontSize: theme.fontSizes.sm,
              cursor: 'pointer',
              outline: 'none',
            }}
          />
        </div>

        {data && (
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Waiting', val: data.stats.waiting, color: theme.colors.yellow },
              { label: 'Confirmed', val: data.stats.confirmed, color: theme.colors.blue },
              { label: 'Active', val: data.stats.active, color: theme.colors.orange },
              { label: 'Done', val: data.stats.completed, color: theme.colors.green },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: theme.fontSizes.xl, fontWeight: 800, color }}>{val}</div>
                <div style={{ fontSize: 10, color: theme.colors.t3, fontWeight: 600 }}>{label}</div>
              </div>
            ))}
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
            padding: 16,
            color: theme.colors.red,
            marginBottom: 20,
            fontSize: theme.fontSizes.sm,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
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
      )}

      {/* Cards */}
      {!loading && (
        <>
          {entries.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 64,
                color: theme.colors.t3,
                fontSize: theme.fontSizes.sm,
              }}
            >
              No requests for today.
            </div>
          )}

          {active.length > 0 && (
            <Section label="Active" color={theme.colors.orange}>
              {active.map((e) => (
                <QueueCard key={e.id} entry={e} onRefresh={() => void load()} />
              ))}
            </Section>
          )}

          {confirmed.length > 0 && (
            <Section label="Confirmed" color={theme.colors.blue}>
              {confirmed.map((e) => (
                <QueueCard key={e.id} entry={e} onRefresh={() => void load()} />
              ))}
            </Section>
          )}

          {waiting.length > 0 && (
            <Section label="Waiting" color={theme.colors.yellow}>
              {waiting.map((e) => (
                <QueueCard key={e.id} entry={e} onRefresh={() => void load()} />
              ))}
            </Section>
          )}

          {completed.length > 0 && (
            <Section label="Completed" color={theme.colors.green}>
              {completed.map((e) => (
                <QueueCard key={e.id} entry={e} onRefresh={() => void load()} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function Section({
  label,
  color,
  children,
}: {
  label: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 10,
          paddingLeft: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
