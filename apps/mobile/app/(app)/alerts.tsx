import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { useWebSocket } from '../../src/hooks/useWebSocket'
import { BellRing, XCircle, Flame, CheckCircle, Info, Zap, Bell } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { colors, font, radius } from '../../src/theme'
import { useBadge } from '../../src/context/BadgeContext'
import { useAuth } from '../../src/context/AuthContext'

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
  unread: boolean
  urgent?: boolean
}

const ALERT_STYLE: Record<AlertType, { Icon: LucideIcon; color: string; bg: string }> = {
  confirm_reminder: { Icon: BellRing, color: colors.red, bg: colors.redD },
  slot_cancelled: { Icon: XCircle, color: colors.red, bg: colors.redD },
  session_started: { Icon: Flame, color: colors.orange, bg: colors.orangeD },
  session_completed: { Icon: CheckCircle, color: colors.green, bg: colors.greenD },
  info: { Icon: Info, color: colors.blue, bg: colors.blueD },
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

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  )
}

let idCounter = 100

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: '1',
    type: 'info',
    title: 'Welcome to AeroFluxPro',
    body: 'Alerts from the preheat system will appear here.',
    timestamp: new Date(Date.now() - 3600000),
    unread: false,
  },
]

export default function AlertsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS)
  const { incAlertBadge, clearAlertBadge } = useBadge()

  // Clear badge when the user is actively viewing this tab
  useFocusEffect(
    useCallback(() => {
      clearAlertBadge()
    }, [clearAlertBadge]),
  )

  function addAlert(type: AlertType, title: string, body: string, urgent = false) {
    const newAlert: AlertItem = {
      id: String(++idCounter),
      type,
      title,
      body,
      timestamp: new Date(),
      unread: true,
      urgent,
    }
    setAlerts((prev) => [newAlert, ...prev])
    incAlertBadge()
  }

  function markAllRead() {
    setAlerts((prev) => prev.map((a) => ({ ...a, unread: false })))
    clearAlertBadge()
  }

  useWebSocket({
    'queue.updated': () => {
      addAlert('info', 'Queue Updated', 'The queue has been updated.')
    },
    'session.started': (data: unknown) => {
      const d = data as { tailNumber?: string; pilotId?: string } | null
      if (d?.pilotId && d.pilotId !== user?.id) return
      addAlert(
        'session_started',
        'Preheat Started',
        d?.tailNumber
          ? `Heating has begun for ${d.tailNumber}.`
          : 'Your preheat session has started.',
      )
    },
    'session.completed': (data: unknown) => {
      const d = data as { tailNumber?: string; pilotId?: string } | null
      if (d?.pilotId && d.pilotId !== user?.id) return
      addAlert(
        'session_completed',
        'Preheat Complete',
        d?.tailNumber ? `${d.tailNumber} is ready to fly!` : 'Your aircraft is ready.',
      )
    },
    'confirm.reminder': (data: unknown) => {
      const d = data as { deadline?: string; pilotId?: string } | null
      if (d?.pilotId && d.pilotId !== user?.id) return
      const deadlineStr = d?.deadline
        ? new Date(d.deadline).toISOString().slice(11, 16) + ' UTC'
        : undefined
      addAlert(
        'confirm_reminder',
        'Confirmation Required',
        deadlineStr
          ? `Confirm before ${deadlineStr} or preheat will be canceled.`
          : 'Your confirmation window is open.',
        true,
      )
    },
    'slot.cancelled': (data: unknown) => {
      const d = data as { pilotId?: string } | null
      if (d?.pilotId && d.pilotId !== user?.id) return
      addAlert('slot_cancelled', 'Slot Cancelled', 'Your preheat slot has been cancelled.')
    },
  })

  const urgentAlerts = alerts.filter((a) => a.urgent && a.unread)
  const todayAlerts = alerts.filter((a) => isToday(a.timestamp) && !a.urgent)
  const olderAlerts = alerts.filter((a) => !isToday(a.timestamp) && !a.urgent)
  const hasUnread = alerts.some((a) => a.unread)

  function renderAlertItem(item: AlertItem) {
    const style = ALERT_STYLE[item.type]
    return (
      <View style={styles.nItem}>
        <View style={[styles.nIconBox, { backgroundColor: style.bg }]}>
          <style.Icon size={17} color={style.color} />
        </View>
        <View style={styles.nBody}>
          <Text style={styles.nTitle}>{item.title}</Text>
          <Text style={styles.nMsg}>{item.body}</Text>
          <Text style={styles.nTime}>{fmtRelative(item.timestamp)}</Text>
        </View>
        {item.unread && <View style={[styles.nDot, { backgroundColor: style.color }]} />}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle}>Notifications</Text>
        {hasUnread && (
          <TouchableOpacity
            onPress={markAllRead}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
          >
            <Text style={styles.markReadBtn}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Bell size={48} color={colors.t2} />
          <Text style={styles.emptyTitle}>No alerts yet</Text>
          <Text style={styles.emptyBody}>
            System notifications and preheat updates will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {/* Urgent alerts */}
          {urgentAlerts.map((alertItem) => {
            const s = ALERT_STYLE[alertItem.type]
            return (
              <TouchableOpacity
                key={alertItem.id}
                style={styles.urgentCard}
                onPress={() => router.push('/(app)/confirm')}
                accessibilityRole="button"
                accessibilityLabel={`Urgent: ${alertItem.title}. Tap to respond.`}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}
                >
                  <Zap size={12} color={colors.red} />
                  <Text style={styles.urgentLabel}>URGENT — TAP TO RESPOND</Text>
                </View>
                <View style={styles.nItem}>
                  <View style={[styles.nIconBox, { backgroundColor: s.bg }]}>
                    <s.Icon size={17} color={s.color} />
                  </View>
                  <View style={styles.nBody}>
                    <Text style={styles.nTitle}>{alertItem.title}</Text>
                    <Text style={styles.nMsg}>{alertItem.body}</Text>
                    <Text style={styles.nTime}>{fmtRelative(alertItem.timestamp)}</Text>
                  </View>
                  <View style={[styles.nDot, { backgroundColor: colors.red }]} />
                </View>
              </TouchableOpacity>
            )
          })}

          {/* Today */}
          {todayAlerts.length > 0 && <Text style={styles.sectionLabel}>Today</Text>}
          {todayAlerts.map((a) => (
            <React.Fragment key={a.id}>{renderAlertItem(a)}</React.Fragment>
          ))}

          {/* Earlier */}
          {olderAlerts.length > 0 && <Text style={styles.sectionLabel}>Earlier</Text>}
          {olderAlerts.map((a) => (
            <React.Fragment key={a.id}>{renderAlertItem(a)}</React.Fragment>
          ))}
        </ScrollView>
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
  screenTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  markReadBtn: { fontSize: 12, color: colors.blue, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.t3,
    marginTop: 12,
    marginBottom: 4,
  },

  // Urgent card
  urgentCard: {
    backgroundColor: 'rgba(240,82,82,0.07)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.redD,
    padding: 12,
    marginBottom: 12,
  },
  urgentLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.red,
  },

  // Notification item
  nItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nIcon: { fontSize: 17 },
  nBody: { flex: 1 },
  nTitle: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 2 },
  nMsg: { fontSize: 12, color: colors.t2, lineHeight: 18 },
  nTime: { fontSize: 11, color: colors.t3, marginTop: 3 },
  nDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyBody: { fontSize: font.base, color: colors.t2, textAlign: 'center', lineHeight: 22 },
})
