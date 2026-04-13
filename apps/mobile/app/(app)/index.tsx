import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { preheatRequestsApi, queueApi, ApiError } from '../../src/lib/api'
import type { PreheatRequest, QueueResponse } from '../../src/lib/api'
import { useWebSocket } from '../../src/hooks/useWebSocket'
import { colors, font, radius } from '../../src/theme'

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', emoji: '☀️' }
  if (h < 18) return { text: 'Good afternoon', emoji: '🌤️' }
  return { text: 'Good evening', emoji: '🌙' }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export default function DashboardScreen() {
  const { user, logout, devLogin } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myRequests, setMyRequests] = useState<PreheatRequest[]>([])
  const [queue, setQueue] = useState<QueueResponse | null>(null)
  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [reqs, q] = await Promise.all([
        preheatRequestsApi.list({ date: todayISO() }),
        queueApi.get({ date: todayISO() }),
      ])
      setMyRequests(reqs)
      setQueue(q)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useWebSocket({
    'queue.updated': () => {
      void fetchData()
    },
  })

  const activeRequest = myRequests.find((r) => r.status === 'active')
  const confirmNeeded = myRequests.filter((r) => {
    if (r.status !== 'waiting') return false
    const now = Date.now()
    const opens = new Date(r.confirmOpensAt).getTime()
    const deadline = new Date(r.confirmDeadline).getTime()
    return now >= opens && now <= deadline
  })

  const greeting = getGreeting()

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {/* Header row with avatar */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>
              {greeting.text} {greeting.emoji}
            </Text>
            <Text style={styles.name}>{user?.name ?? 'Pilot'}</Text>
          </View>
          <TouchableOpacity style={styles.avatarWrap} onPress={() => router.push('/(app)/profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user?.name ?? 'P')}</Text>
            </View>
            {confirmNeeded.length > 0 && <View style={styles.avatarDot} />}
          </TouchableOpacity>
        </View>

        {/* Alert banner */}
        {confirmNeeded.length > 0 && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => router.push('/(app)/confirm')}
          >
            <Text style={styles.alertIcon}>⏰</Text>
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>Confirmation Required</Text>
              <Text style={styles.alertBody}>
                {confirmNeeded.length} request{confirmNeeded.length > 1 ? 's' : ''} need
                confirmation. Tap to confirm.
              </Text>
            </View>
            <Text style={styles.alertChevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* Loading / Error */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} />
          </View>
        )}
        {!loading && error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void fetchData()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active flight card */}
        {!loading && activeRequest && (
          <View style={styles.flightCard}>
            <View style={styles.flightCardHeader}>
              <Text style={styles.flightTail}>{activeRequest.tailNumber ?? '—'}</Text>
              <StatusPill status={activeRequest.status} />
            </View>
            <View style={styles.flightGrid}>
              <View style={styles.flightGridItem}>
                <Text style={styles.flightGridLabel}>🔥 Preheat</Text>
                <Text style={styles.flightGridValue}>{fmtTime(activeRequest.assignedTime)}</Text>
              </View>
              <View style={styles.flightGridItem}>
                <Text style={styles.flightGridLabel}>✈️ Engine Start</Text>
                <Text style={styles.flightGridValue}>{fmtTime(activeRequest.engineStartTime)}</Text>
              </View>
              <View style={styles.flightGridItem}>
                <Text style={styles.flightGridLabel}>📍 Queue Pos.</Text>
                <Text style={[styles.flightGridValue, { color: colors.blue }]}>
                  #{activeRequest.queuePosition}
                </Text>
              </View>
              <View style={styles.flightGridItem}>
                <Text style={styles.flightGridLabel}>📊 Status</Text>
                <Text style={[styles.flightGridValue, { color: colors.green }]}>Active</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.flightBtn} onPress={() => router.push('/(app)/track')}>
              <Text style={styles.flightBtnText}>Track Session →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Confirm needed flight card */}
        {!loading && !activeRequest && confirmNeeded.length > 0 && (
          <View style={styles.flightCard}>
            <View style={styles.flightCardHeader}>
              <Text style={styles.flightTail}>{confirmNeeded[0].tailNumber ?? '—'}</Text>
              <StatusPill status="confirm" />
            </View>
            <View style={styles.flightGrid}>
              <View style={styles.flightGridItem}>
                <Text style={styles.flightGridLabel}>🔥 Preheat</Text>
                <Text style={styles.flightGridValue}>{fmtTime(confirmNeeded[0].assignedTime)}</Text>
              </View>
              <View style={styles.flightGridItem}>
                <Text style={styles.flightGridLabel}>✈️ Engine Start</Text>
                <Text style={styles.flightGridValue}>
                  {fmtTime(confirmNeeded[0].engineStartTime)}
                </Text>
              </View>
              <View style={styles.flightGridItem}>
                <Text style={styles.flightGridLabel}>📍 Queue Pos.</Text>
                <Text style={[styles.flightGridValue, { color: colors.blue }]}>
                  #{confirmNeeded[0].queuePosition}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.confirmFlightBtn}
              onPress={() => router.push('/(app)/confirm')}
            >
              <Text style={styles.confirmFlightBtnText}>Confirm My Attendance →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBox} onPress={() => router.push('/(app)/request')}>
              <Text style={styles.quickIcon}>🔥</Text>
              <Text style={styles.quickLabel}>Request</Text>
              <Text style={styles.quickSub}>Preheat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBox} onPress={() => router.push('/(app)/queue')}>
              <Text style={styles.quickIcon}>📋</Text>
              <Text style={styles.quickLabel}>View</Text>
              <Text style={styles.quickSub}>Queue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBox} onPress={() => router.push('/(app)/track')}>
              <Text style={styles.quickIcon}>📊</Text>
              <Text style={styles.quickLabel}>Track</Text>
              <Text style={styles.quickSub}>Status</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Queue summary */}
        {!loading && queue && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TODAY'S QUEUE</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Waiting</Text>
                <Text style={[styles.statNum, { color: colors.yellow }]}>
                  {queue.stats.waiting}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Active</Text>
                <Text style={[styles.statNum, { color: colors.orange }]}>{queue.stats.active}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Done</Text>
                <Text style={[styles.statNum, { color: colors.green }]}>
                  {queue.stats.completed}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent activity */}
        {!loading && myRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
            {myRequests.slice(0, 5).map((req) => {
              const iconStyle = getActivityIcon(req.status)
              return (
                <View key={req.id} style={styles.activityItem}>
                  <View style={[styles.activityIconBox, { backgroundColor: iconStyle.bg }]}>
                    <Text style={styles.activityIconText}>{iconStyle.icon}</Text>
                  </View>
                  <View style={styles.activityBody}>
                    <Text style={styles.activityTitle}>
                      {req.status === 'completed'
                        ? `Preheat completed – ${req.tailNumber}`
                        : req.status === 'active'
                          ? `Preheat active – ${req.tailNumber}`
                          : `Schedule assigned – ${req.tailNumber}`}
                    </Text>
                    <Text style={styles.activitySub}>
                      Engine start: {fmtTime(req.engineStartTime)}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Dev panel */}
        {__DEV__ && (
          <View style={styles.devPanel}>
            <Text style={styles.devTitle}>Dev Panel</Text>
            <View style={styles.devRow}>
              <TouchableOpacity style={styles.devBtn} onPress={() => devLogin('pilot')}>
                <Text style={styles.devBtnText}>Dev Pilot</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.devBtn} onPress={() => devLogin('mechanic')}>
                <Text style={styles.devBtnText}>Dev Mechanic</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devBtn, { borderColor: colors.redD }]}
                onPress={() => void logout()}
              >
                <Text style={[styles.devBtnText, { color: colors.red }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function getActivityIcon(status: string): { icon: string; bg: string } {
  switch (status) {
    case 'completed':
      return { icon: '✅', bg: colors.greenD }
    case 'active':
      return { icon: '🔥', bg: colors.orangeD }
    case 'cancelled':
      return { icon: '❌', bg: colors.redD }
    default:
      return { icon: '📅', bg: colors.blueD }
  }
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    waiting: { bg: colors.yellow + '33', fg: colors.yellow, label: 'Waiting' },
    confirm: { bg: colors.orangeD, fg: colors.orange, label: 'Confirm Required' },
    confirmed: { bg: colors.blue + '33', fg: colors.blue, label: 'Confirmed' },
    active: { bg: colors.green + '33', fg: colors.green, label: 'Active' },
    completed: { bg: colors.t3 + '55', fg: colors.t2, label: 'Done' },
    cancelled: { bg: colors.redD, fg: colors.red, label: 'Cancelled' },
  }
  const c = map[status] ?? { bg: colors.s3, fg: colors.t2, label: status }
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: c.fg }]} />
      <Text style={[styles.pillText, { color: c.fg }]}>{c.label.toUpperCase()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  greeting: { fontSize: 13, color: colors.t2 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 2 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blueD,
  },
  avatarText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  avatarDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    backgroundColor: colors.red,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.bg,
  },

  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orangeD,
    borderWidth: 1,
    borderColor: colors.orange,
    borderRadius: radius.md,
    padding: 13,
    marginBottom: 14,
    gap: 11,
  },
  alertIcon: { fontSize: 18 },
  alertText: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: '700', color: colors.orange },
  alertBody: { fontSize: 12, color: colors.t2, marginTop: 2 },
  alertChevron: { fontSize: 20, color: colors.orange },

  // Loading / Error
  center: { alignItems: 'center', paddingVertical: 40 },
  errorBox: {
    backgroundColor: colors.redD,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorText: { color: colors.red, fontSize: font.base },
  retryText: {
    color: colors.red,
    fontSize: font.base,
    marginTop: 8,
    textDecorationLine: 'underline',
  },

  // Flight card (blue gradient style)
  flightCard: {
    backgroundColor: '#12213F',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.blueD,
    padding: 20,
    marginBottom: 14,
    shadowColor: colors.blue,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  flightCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  flightTail: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  flightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  flightGridItem: { width: '46%' },
  flightGridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  flightGridValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  flightBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.blue,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  flightBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  confirmFlightBtn: {
    backgroundColor: colors.orange,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.orange,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmFlightBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },

  // Quick actions
  section: { marginTop: 10, marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.t3,
    marginBottom: 8,
  },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBox: {
    flex: 1,
    backgroundColor: colors.s2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 3,
  },
  quickIcon: { fontSize: 28 },
  quickLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 6 },
  quickSub: { fontSize: 11, color: colors.t3 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: colors.s2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: colors.t3,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: colors.text },

  // Recent activity
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconText: { fontSize: 17 },
  activityBody: { flex: 1 },
  activityTitle: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 2 },
  activitySub: { fontSize: 12, color: colors.t2, lineHeight: 18 },

  // Dev panel
  devPanel: {
    marginTop: 20,
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  devTitle: { fontSize: font.sm, color: colors.t3, marginBottom: 10, fontWeight: '600' },
  devRow: { flexDirection: 'row', gap: 8 },
  devBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  devBtnText: { color: colors.t2, fontSize: font.sm, fontWeight: '600' },
})
