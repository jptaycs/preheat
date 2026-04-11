import React, { useCallback, useEffect, useState } from 'react'
import type { QueueEntry, QueueResponse } from '../lib/api'
import { queueApi, sessionsApi, preheatRequestsApi } from '../lib/api'
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const STATUS_COLORS: Record<string, string> = {
  waiting: theme.colors.yellow,
  confirmed: theme.colors.blue,
  active: theme.colors.orange,
  completed: theme.colors.green,
  cancelled: theme.colors.t3,
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? theme.colors.t2
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 99,
        background: `${color}22`,
        border: `1px solid ${color}66`,
        color,
        fontSize: theme.fontSizes.xs,
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div
      style={{
        background: theme.colors.s1,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
        minWidth: 120,
      }}
    >
      <div
        style={{
          fontSize: theme.fontSizes.xxl,
          fontWeight: 700,
          color: accent ?? theme.colors.text,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.t2, marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

// ── Row actions ────────────────────────────────────────────────────────────

function RowActions({ entry, onRefresh }: { entry: QueueEntry; onRefresh: () => void }) {
  const [temp, setTemp] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null)
    setBusy(true)
    try {
      await fn()
      onRefresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const btnBase: React.CSSProperties = {
    padding: '4px 12px',
    borderRadius: theme.radius.sm,
    fontSize: theme.fontSizes.xs,
    fontWeight: 600,
    cursor: busy ? 'not-allowed' : 'pointer',
    border: 'none',
    opacity: busy ? 0.5 : 1,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
      {entry.status === 'confirmed' && (
        <button
          style={{ ...btnBase, background: theme.colors.orange, color: '#fff' }}
          disabled={busy}
          onClick={() => {
            void run(() => sessionsApi.start(entry.id))
          }}
        >
          Start Preheat
        </button>
      )}

      {entry.status === 'active' && entry.sessionId && (
        <>
          <input
            type="number"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="°C"
            style={{
              width: 64,
              padding: '4px 8px',
              background: theme.colors.s2,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.sm,
              color: theme.colors.text,
              fontSize: theme.fontSizes.xs,
            }}
          />
          <button
            style={{ ...btnBase, background: theme.colors.blue, color: '#fff' }}
            disabled={busy || !temp}
            onClick={() => {
              void run(() => sessionsApi.addReading(entry.sessionId!, parseFloat(temp)))
            }}
          >
            Update Temp
          </button>
          <button
            style={{ ...btnBase, background: theme.colors.green, color: '#000' }}
            disabled={busy}
            onClick={() => {
              void run(() => sessionsApi.complete(entry.sessionId!))
            }}
          >
            Complete
          </button>
        </>
      )}

      {(entry.status === 'waiting' || entry.status === 'confirmed') && (
        <button
          style={{
            ...btnBase,
            background: theme.colors.s2,
            color: theme.colors.red,
            border: `1px solid ${theme.colors.red}44`,
          }}
          disabled={busy}
          onClick={() => {
            void run(() => preheatRequestsApi.cancel(entry.id))
          }}
        >
          Cancel
        </button>
      )}

      {err && <span style={{ color: theme.colors.red, fontSize: theme.fontSizes.xs }}>{err}</span>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const [date, setDate] = useState(todayISO())
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

  // WebSocket auto-refresh
  useEffect(() => {
    const unsubs = [
      onWsEvent('queue.updated', () => {
        void load()
      }),
      onWsEvent('session.started', () => {
        void load()
      }),
      onWsEvent('session.completed', () => {
        void load()
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [load])

  const now = new Date()
  const needsAttention = (data?.entries ?? []).filter((e) => {
    if (e.status !== 'waiting') return false
    const opens = new Date(e.confirmOpensAt)
    const deadline = new Date(e.confirmDeadline)
    return now >= opens && now < deadline
  })

  const stats = data?.stats ?? { waiting: 0, confirmed: 0, active: 0, completed: 0 }
  const totalToday = stats.waiting + stats.confirmed + stats.active + stats.completed
  const cancelled = (data?.entries ?? []).filter((e) => e.status === 'cancelled').length

  return (
    <div style={{ padding: theme.spacing.xl }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.xl,
        }}
      >
        <h1 style={{ fontSize: theme.fontSizes.xl, fontWeight: 700, color: theme.colors.text }}>
          Dashboard
        </h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: `${theme.spacing.xs} ${theme.spacing.md}`,
            background: theme.colors.s1,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            color: theme.colors.text,
            fontSize: theme.fontSizes.sm,
          }}
        />
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.xl,
          flexWrap: 'wrap',
        }}
      >
        <StatCard label="Total Today" value={totalToday} />
        <StatCard label="Waiting" value={stats.waiting} accent={theme.colors.yellow} />
        <StatCard label="Confirmed" value={stats.confirmed} accent={theme.colors.blue} />
        <StatCard label="Active" value={stats.active} accent={theme.colors.orange} />
        <StatCard label="Completed" value={stats.completed} accent={theme.colors.green} />
        <StatCard label="Cancelled" value={cancelled} accent={theme.colors.t3} />
      </div>

      {/* Needs attention banner */}
      {needsAttention.length > 0 && (
        <div
          style={{
            background: `${theme.colors.orange}18`,
            border: `1px solid ${theme.colors.orange}66`,
            borderRadius: theme.radius.md,
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            marginBottom: theme.spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <span style={{ color: theme.colors.orange, fontWeight: 700 }}>
            {needsAttention.length} request{needsAttention.length > 1 ? 's' : ''} in confirm window
          </span>
          <span style={{ color: theme.colors.t2, fontSize: theme.fontSizes.sm }}>
            — pilots should be confirming right now:{' '}
            {needsAttention.map((e) => e.tailNumber).join(', ')}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            background: `${theme.colors.red}22`,
            border: `1px solid ${theme.colors.red}44`,
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            color: theme.colors.red,
            marginBottom: theme.spacing.lg,
          }}
        >
          {error}
        </div>
      )}

      {/* Queue table */}
      <div
        style={{
          background: theme.colors.s1,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
              {[
                '#',
                'Tail #',
                'Aircraft',
                'Pilot',
                'Engine Start',
                'Assigned Time',
                'Status',
                'Actions',
              ].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    textAlign: 'left',
                    fontSize: theme.fontSizes.xs,
                    color: theme.colors.t2,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: theme.spacing.xl,
                    textAlign: 'center',
                    color: theme.colors.t2,
                    fontSize: theme.fontSizes.sm,
                  }}
                >
                  Loading…
                </td>
              </tr>
            )}
            {!loading && (!data || data.entries.length === 0) && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: theme.spacing.xl,
                    textAlign: 'center',
                    color: theme.colors.t2,
                    fontSize: theme.fontSizes.sm,
                  }}
                >
                  No requests for this date.
                </td>
              </tr>
            )}
            {!loading &&
              data?.entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom:
                      i < data.entries.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                    background: i % 2 === 1 ? `${theme.colors.s2}60` : 'transparent',
                  }}
                >
                  <td style={tdStyle}>{entry.queuePosition}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: theme.colors.text }}>
                    {entry.tailNumber}
                  </td>
                  <td style={{ ...tdStyle, color: theme.colors.t2 }}>{entry.aircraftType}</td>
                  <td style={{ ...tdStyle, color: theme.colors.t2 }}>{entry.pilotFirstName}</td>
                  <td style={tdStyle}>{fmt(entry.engineStartTime)}</td>
                  <td style={tdStyle}>{fmt(entry.assignedTime)}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={entry.status} />
                  </td>
                  <td style={{ ...tdStyle, minWidth: 220 }}>
                    <RowActions
                      entry={entry}
                      onRefresh={() => {
                        void load()
                      }}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const tdStyle: React.CSSProperties = {
  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
  fontSize: theme.fontSizes.sm,
  color: theme.colors.text,
  whiteSpace: 'nowrap',
}
