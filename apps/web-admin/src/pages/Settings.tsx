import React from 'react'
import { theme } from '../theme'

const s: Record<string, React.CSSProperties> = {
  root: { padding: 32 },
  title: { fontSize: 24, fontWeight: 800, color: theme.colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: theme.colors.t2, marginBottom: 32 },
  card: {
    backgroundColor: theme.colors.s1,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    maxWidth: 640,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: theme.colors.text, marginBottom: 16 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  rowLabel: { fontSize: 14, color: theme.colors.t2 },
  rowValue: { fontSize: 14, fontWeight: 600, color: theme.colors.text },
  notice: {
    backgroundColor: theme.colors.blueD + '44',
    border: `1px solid ${theme.colors.blue}44`,
    borderRadius: 10,
    padding: 16,
    maxWidth: 640,
    marginTop: 8,
  },
  noticeText: { fontSize: 13, color: theme.colors.t2, lineHeight: '1.6' },
}

export default function Settings() {
  return (
    <div style={s.root}>
      <h1 style={s.title}>Settings</h1>
      <p style={s.sub}>Operational configuration for the AeroFluxPro preheat system.</p>

      <div style={s.card}>
        <div style={s.cardTitle}>Queue Rules</div>
        <div style={s.row}>
          <span style={s.rowLabel}>Slot spacing (min between engine starts)</span>
          <span style={s.rowValue}>15 min</span>
        </div>
        <div style={s.row}>
          <span style={s.rowLabel}>Confirmation window opens before engine start</span>
          <span style={s.rowValue}>40 min</span>
        </div>
        <div style={s.row}>
          <span style={s.rowLabel}>Confirmation deadline before engine start</span>
          <span style={s.rowValue}>30 min</span>
        </div>
        <div style={{ ...s.row, borderBottom: 'none' }}>
          <span style={s.rowLabel}>Preheat duration (estimated)</span>
          <span style={s.rowValue}>20 min</span>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Booking Rules</div>
        <div style={s.row}>
          <span style={s.rowLabel}>Booking window opens</span>
          <span style={s.rowValue}>19:00 UTC day before</span>
        </div>
        <div style={{ ...s.row, borderBottom: 'none' }}>
          <span style={s.rowLabel}>Auto-cancel unconfirmed slots</span>
          <span style={s.rowValue}>Yes (every 60s)</span>
        </div>
      </div>

      <div style={s.notice}>
        <p style={s.noticeText}>
          Settings management (editable slot duration, operating hours, max queue length) will be
          available in a future session. These values are currently configured in the API source
          code.
        </p>
      </div>
    </div>
  )
}
