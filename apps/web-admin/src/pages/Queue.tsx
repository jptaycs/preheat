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

const ALL_STATUSES = ['all', 'waiting', 'confirmed', 'active', 'completed', 'cancelled']

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

// ── Session detail panel ───────────────────────────────────────────────────

interface Reading {
  tempCelsius: number
  recordedAt: string
}

interface SessionDetail {
  id: string
  startedAt: string
  completedAt?: string
  readings?: Reading[]
}

function SessionPanel({ session }: { session: SessionDetail }) {
  return (
    <div
      style={{
        background: theme.colors.s2,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginTop: theme.spacing.sm,
      }}
    >
      <div
        style={{
          fontSize: theme.fontSizes.xs,
          color: theme.colors.t2,
          marginBottom: theme.spacing.sm,
        }}
      >
        Session started {fmt(session.startedAt)}
        {session.completedAt && ` · Completed ${fmt(session.completedAt)}`}
      </div>
      {session.readings && session.readings.length > 0 ? (
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          {session.readings.map((r, i) => (
            <div
              key={i}
              style={{
                background: theme.colors.s1,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.sm,
                padding: '4px 10px',
                fontSize: theme.fontSizes.xs,
                color: theme.colors.text,
              }}
            >
              <span style={{ color: theme.colors.orange, fontWeight: 700 }}>{r.tempCelsius}°C</span>
              <span style={{ color: theme.colors.t2, marginLeft: 4 }}>{fmt(r.recordedAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.t3 }}>
          No temperature readings yet.
        </div>
      )}
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

// ── Expanded row ───────────────────────────────────────────────────────────

function ExpandedRow({ entry, onRefresh }: { entry: QueueEntry; onRefresh: () => void }) {
  // Fake session detail shape from what the entry already provides
  const session: SessionDetail | null = entry.sessionId
    ? {
        id: entry.sessionId,
        startedAt: entry.assignedTime, // approximation until real endpoint
        readings: [],
      }
    : null

  return (
    <td
      colSpan={9}
      style={{
        padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
        background: `${theme.colors.s2}80`,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      <div style={{ display: 'flex', gap: theme.spacing.xl, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: theme.fontSizes.xs,
              color: theme.colors.t2,
              marginBottom: theme.spacing.xs,
            }}
          >
            Confirm window: {fmt(entry.confirmOpensAt)} – {fmt(entry.confirmDeadline)}
          </div>
          <RowActions entry={entry} onRefresh={onRefresh} />
        </div>
        {session && (
          <div style={{ flex: 2 }}>
            <SessionPanel session={session} />
          </div>
        )}
      </div>
    </td>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Queue() {
  const [dateFrom, setDateFrom] = useState(todayISO())
  const [dateTo, setDateTo] = useState(todayISO())
  const [statusFilter, setStatusFilter] = useState('all')
  const [data, setData] = useState<QueueResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      // Load the "from" date; multi-day would require a different endpoint
      const res = await queueApi.get(dateFrom)
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [dateFrom])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

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

  const entries = (data?.entries ?? []).filter(
    (e) => statusFilter === 'all' || e.status === statusFilter,
  )

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div style={{ padding: theme.spacing.xl }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.xl,
          flexWrap: 'wrap',
          gap: theme.spacing.md,
        }}
      >
        <h1 style={{ fontSize: theme.fontSizes.xl, fontWeight: 700, color: theme.colors.text }}>
          Queue Management
        </h1>

        <div
          style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}
        >
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
              background: theme.colors.s1,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              color: theme.colors.text,
              fontSize: theme.fontSizes.sm,
            }}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s} style={{ background: theme.colors.s1 }}>
                {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={dateInputStyle}
            />
            <span style={{ color: theme.colors.t2, fontSize: theme.fontSizes.sm }}>to</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              style={dateInputStyle}
            />
          </div>
        </div>
      </div>

      {/* Summary counts */}
      {data && (
        <div
          style={{
            display: 'flex',
            gap: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            flexWrap: 'wrap',
          }}
        >
          {Object.entries(data.stats).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: STATUS_COLORS[key] ?? theme.colors.t2,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: theme.fontSizes.sm, color: theme.colors.t2 }}>
                {key}: <strong style={{ color: theme.colors.text }}>{val}</strong>
              </span>
            </div>
          ))}
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

      {/* Table */}
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
              <th style={thStyle} />
              {[
                '#',
                'Tail #',
                'Aircraft',
                'Pilot',
                'Engine Start',
                'Assigned',
                'Confirm Window',
                'Status',
              ].map((col) => (
                <th key={col} style={thStyle}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} style={emptyTdStyle}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={9} style={emptyTdStyle}>
                  No requests match the selected filters.
                </td>
              </tr>
            )}
            {!loading &&
              entries.map((entry, i) => {
                const isExpanded = expandedId === entry.id
                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      style={{
                        borderBottom: `1px solid ${theme.colors.border}`,
                        background: isExpanded
                          ? `${theme.colors.blue}10`
                          : i % 2 === 1
                            ? `${theme.colors.s2}60`
                            : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleExpand(entry.id)}
                    >
                      {/* Expand chevron */}
                      <td
                        style={{
                          ...tdStyle,
                          width: 32,
                          textAlign: 'center',
                          color: theme.colors.t2,
                        }}
                      >
                        {isExpanded ? '▾' : '▸'}
                      </td>
                      <td style={tdStyle}>{entry.queuePosition}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{entry.tailNumber}</td>
                      <td style={{ ...tdStyle, color: theme.colors.t2 }}>{entry.aircraftType}</td>
                      <td style={{ ...tdStyle, color: theme.colors.t2 }}>{entry.pilotFirstName}</td>
                      <td style={tdStyle}>{fmt(entry.engineStartTime)}</td>
                      <td style={tdStyle}>{fmt(entry.assignedTime)}</td>
                      <td
                        style={{ ...tdStyle, color: theme.colors.t2, fontSize: theme.fontSizes.xs }}
                      >
                        {fmt(entry.confirmOpensAt)} – {fmt(entry.confirmDeadline)}
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={entry.status} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <ExpandedRow
                          entry={entry}
                          onRefresh={() => {
                            void load()
                          }}
                        />
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: theme.spacing.sm,
          fontSize: theme.fontSizes.xs,
          color: theme.colors.t3,
        }}
      >
        Click a row to expand session details and actions. Auto-refreshes via WebSocket.
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
  textAlign: 'left',
  fontSize: theme.fontSizes.xs,
  color: theme.colors.t2,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
  fontSize: theme.fontSizes.sm,
  color: theme.colors.text,
  whiteSpace: 'nowrap',
}

const emptyTdStyle: React.CSSProperties = {
  padding: theme.spacing.xl,
  textAlign: 'center',
  color: theme.colors.t2,
  fontSize: theme.fontSizes.sm,
}

const dateInputStyle: React.CSSProperties = {
  padding: `${theme.spacing.xs} ${theme.spacing.md}`,
  background: theme.colors.s1,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.radius.md,
  color: theme.colors.text,
  fontSize: theme.fontSizes.sm,
}
