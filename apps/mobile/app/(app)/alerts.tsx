import React, { useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { useWebSocket } from '../../src/hooks/useWebSocket'
import { BellRing, XCircle, Flame, CheckCircle, Info, Zap, Bell } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { font } from '../../src/theme'
import type { ThemeColors } from '../../src/theme'
import { useTheme } from '../../src/context/ThemeContext'
import { useBadge } from '../../src/context/BadgeContext'
import { useAuth } from '../../src/context/AuthContext'
import {
  Card,
  LargeTitle,
  ListGroup,
  ListRow,
  SectionHeader,
  toneFg,
} from '../../src/components/ui'
import type { Tone } from '../../src/components/ui'

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

const ALERT_STYLE: Record<AlertType, { Icon: LucideIcon; tone: Tone }> = {
  confirm_reminder: { Icon: BellRing, tone: 'red' },
  slot_cancelled: { Icon: XCircle, tone: 'red' },
  session_started: { Icon: Flame, tone: 'orange' },
  session_completed: { Icon: CheckCircle, tone: 'green' },
  info: { Icon: Info, tone: 'blue' },
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
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
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

  function renderAlertRow(item: AlertItem) {
    const style = ALERT_STYLE[item.type]
    return (
      <ListRow
        key={item.id}
        icon={style.Icon}
        tone={style.tone}
        title={item.title}
        subtitle={item.body}
        value={fmtRelative(item.timestamp)}
        trailing={
          item.unread ? (
            <View style={[styles.nDot, { backgroundColor: toneFg(colors, style.tone) }]} />
          ) : undefined
        }
      />
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerBar}>
        <LargeTitle
          title="Notifications"
          trailing={
            hasUnread ? (
              <TouchableOpacity
                onPress={markAllRead}
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
              >
                <Text style={styles.markReadBtn}>Mark all read</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
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
                onPress={() => router.push('/(app)/confirm')}
                accessibilityRole="button"
                accessibilityLabel={`Urgent: ${alertItem.title}. Tap to respond.`}
              >
                <Card style={styles.urgentCard}>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}
                  >
                    <Zap size={12} color={colors.red} />
                    <Text style={styles.urgentLabel}>URGENT — TAP TO RESPOND</Text>
                  </View>
                  <ListRow
                    icon={s.Icon}
                    tone={s.tone}
                    title={alertItem.title}
                    subtitle={alertItem.body}
                    value={fmtRelative(alertItem.timestamp)}
                    trailing={<View style={[styles.nDot, { backgroundColor: colors.red }]} />}
                    style={{ paddingHorizontal: 0, paddingVertical: 0 }}
                  />
                </Card>
              </TouchableOpacity>
            )
          })}

          {/* Today */}
          {todayAlerts.length > 0 && (
            <>
              <SectionHeader title="Today" style={styles.sectionLabel} />
              <ListGroup style={styles.group}>
                {todayAlerts.map((a) => renderAlertRow(a))}
              </ListGroup>
            </>
          )}

          {/* Earlier */}
          {olderAlerts.length > 0 && (
            <>
              <SectionHeader title="Earlier" style={styles.sectionLabel} />
              <ListGroup style={styles.group}>
                {olderAlerts.map((a) => renderAlertRow(a))}
              </ListGroup>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    headerBar: { paddingHorizontal: 20, paddingTop: 10 },
    markReadBtn: { fontSize: 13, color: colors.blue, fontWeight: '600' },
    listContent: { padding: 16, paddingBottom: 100 },

    // Section label
    sectionLabel: { marginTop: 12, marginLeft: 0 },
    group: { marginBottom: 4 },

    // Urgent card
    urgentCard: {
      backgroundColor: colors.redD,
      padding: 12,
      marginBottom: 12,
      shadowOpacity: 0,
      elevation: 0,
    },
    urgentLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.red,
    },

    nDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    // Empty
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyTitle: { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: 8 },
    emptyBody: { fontSize: font.base, color: colors.t2, textAlign: 'center', lineHeight: 22 },
  })
