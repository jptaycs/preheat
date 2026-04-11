import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { useWebSocket } from '../../src/hooks/useWebSocket'
import { colors, font, radius } from '../../src/theme'

type AlertType =
  | 'confirm_reminder'
  | 'slot_cancelled'
  | 'session_started'
  | 'session_completed'
  | 'info'

interface AlertItem {
  id: string
  type: AlertType
  title: string
  body: string
  timestamp: Date
}

const ALERT_STYLE: Record<AlertType, { icon: string; color: string; bg: string }> = {
  confirm_reminder: { icon: '⚠️', color: colors.yellow, bg: colors.yellow + '1A' },
  slot_cancelled: { icon: '❌', color: colors.red, bg: colors.redD },
  session_started: { icon: '🔥', color: colors.blue, bg: colors.blueG },
  session_completed: { icon: '✅', color: colors.green, bg: colors.greenD },
  info: { icon: 'ℹ️', color: colors.t2, bg: colors.s2 },
}

function fmtRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return date.toLocaleDateString()
}

let idCounter = 100

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: '1',
    type: 'info',
    title: 'Welcome to AeroFluxPro',
    body: 'Alerts from the preheat system will appear here.',
    timestamp: new Date(Date.now() - 3600000),
  },
]

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS)

  function addAlert(type: AlertType, title: string, body: string) {
    const newAlert: AlertItem = {
      id: String(++idCounter),
      type,
      title,
      body,
      timestamp: new Date(),
    }
    setAlerts((prev) => [newAlert, ...prev])
  }

  useWebSocket({
    'queue.updated': () => {
      addAlert('info', 'Queue Updated', 'The queue has been updated.')
    },
    'session.started': (data: unknown) => {
      const d = data as { tailNumber?: string } | null
      addAlert(
        'session_started',
        'Preheat Started',
        d?.tailNumber
          ? `Heating has begun for ${d.tailNumber}.`
          : 'Your preheat session has started.',
      )
    },
    'session.completed': (data: unknown) => {
      const d = data as { tailNumber?: string } | null
      addAlert(
        'session_completed',
        'Preheat Complete',
        d?.tailNumber ? `${d.tailNumber} is ready to fly!` : 'Your aircraft is ready.',
      )
    },
    'confirm.reminder': (data: unknown) => {
      const d = data as { deadline?: string } | null
      addAlert(
        'confirm_reminder',
        'Confirm Your Slot',
        d?.deadline ? `Deadline: ${d.deadline}` : 'Your confirmation window is open.',
      )
    },
    'slot.cancelled': (data: unknown) => {
      const d = data as { reason?: string } | null
      addAlert(
        'slot_cancelled',
        'Slot Cancelled',
        d?.reason ?? 'Your preheat slot has been cancelled.',
      )
    },
  })

  function renderItem({ item }: { item: AlertItem }) {
    const style = ALERT_STYLE[item.type]
    return (
      <View
        style={[styles.alertCard, { backgroundColor: style.bg, borderColor: style.color + '44' }]}
      >
        <View style={styles.alertIconBox}>
          <Text style={styles.alertIcon}>{style.icon}</Text>
        </View>
        <View style={styles.alertContent}>
          <View style={styles.alertTopRow}>
            <Text style={[styles.alertTitle, { color: style.color }]}>{item.title}</Text>
            <Text style={styles.alertTime}>{fmtRelative(item.timestamp)}</Text>
          </View>
          <Text style={styles.alertBody}>{item.body}</Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle}>Alerts</Text>
        {alerts.length > 0 && (
          <TouchableOpacity onPress={() => setAlerts([])}>
            <Text style={styles.clearBtn}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No alerts yet</Text>
          <Text style={styles.emptyBody}>
            System notifications and preheat updates will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  screenTitle: { fontSize: font.xxl, fontWeight: '800', color: colors.text },
  clearBtn: { fontSize: font.base, color: colors.red },
  listContent: { padding: 16, paddingBottom: 40 },
  alertCard: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  alertIconBox: { width: 36, alignItems: 'center', paddingTop: 2 },
  alertIcon: { fontSize: 22 },
  alertContent: { flex: 1 },
  alertTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  alertTitle: { fontSize: font.base, fontWeight: '700', flex: 1, marginRight: 8 },
  alertTime: { fontSize: font.sm, color: colors.t3 },
  alertBody: { fontSize: font.sm, color: colors.t2, lineHeight: 20 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyBody: { fontSize: font.base, color: colors.t2, textAlign: 'center', lineHeight: 22 },
})
