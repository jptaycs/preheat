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
import { preheatRequestsApi, queueApi, authApi, ApiError } from '../../src/lib/api'
import type { PreheatRequest, QueueResponse } from '../../src/lib/api'
import { useWebSocket } from '../../src/hooks/useWebSocket'
import { colors, font, radius } from '../../src/theme'
import { storage } from '../../src/lib/storage'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
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

export default function DashboardScreen() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myRequests, setMyRequests] = useState<PreheatRequest[]>([])
  const [queue, setQueue] = useState<QueueResponse | null>(null)
  const [devLoading, setDevLoading] = useState(false)

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

  async function devLoginAs(role: 'pilot' | 'mechanic') {
    setDevLoading(true)
    try {
      const email = role === 'pilot' ? 'pilot@dev.local' : 'mechanic@dev.local'
      const { accessToken, refreshToken } = await authApi.login({
        email,
        password: 'devpassword',
      })
      await storage.setTokens(accessToken, refreshToken)
      // Force a page reload by navigating
      router.replace('/(app)')
    } catch {
      // ignore
    } finally {
      setDevLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{user?.name ?? 'Pilot'}</Text>
        </View>

        {/* Alert banner */}
        {confirmNeeded.length > 0 && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => router.push('/(app)/confirm')}
          >
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>Action needed</Text>
              <Text style={styles.alertBody}>
                {confirmNeeded.length} request{confirmNeeded.length > 1 ? 's' : ''} need
                confirmation now
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
          <View style={styles.activeCard}>
            <View style={styles.activeCardHeader}>
              <Text style={styles.activeCardLabel}>ACTIVE PREHEAT</Text>
              <View style={[styles.badge, { backgroundColor: colors.green + '33' }]}>
                <Text style={[styles.badgeText, { color: colors.green }]}>ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.activeTail}>{activeRequest.tailNumber ?? '—'}</Text>
            {activeRequest.aircraftType ? (
              <Text style={styles.activeType}>{activeRequest.aircraftType}</Text>
            ) : null}
            <View style={styles.activeRow}>
              <View style={styles.activeStat}>
                <Text style={styles.activeStatLabel}>Queue Position</Text>
                <Text style={styles.activeStatValue}>#{activeRequest.queuePosition}</Text>
              </View>
              <View style={styles.activeStat}>
                <Text style={styles.activeStatLabel}>Assigned Time</Text>
                <Text style={styles.activeStatValue}>{fmtTime(activeRequest.assignedTime)}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.trackBtn} onPress={() => router.push('/(app)/track')}>
              <Text style={styles.trackBtnText}>Track Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(app)/request')}>
              <Text style={styles.quickBtnIcon}>✈️</Text>
              <Text style={styles.quickBtnText}>Request Preheat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, styles.quickBtnSecondary]}
              onPress={() => router.push('/(app)/queue')}
            >
              <Text style={styles.quickBtnIcon}>📋</Text>
              <Text style={styles.quickBtnText}>View Queue</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Queue summary */}
        {!loading && queue && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Queue</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{queue.stats.waiting}</Text>
                <Text style={styles.statLabel}>Waiting</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.blue }]}>
                  {queue.stats.confirmed}
                </Text>
                <Text style={styles.statLabel}>Confirmed</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.green }]}>{queue.stats.active}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.t2 }]}>{queue.stats.completed}</Text>
                <Text style={styles.statLabel}>Done</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent activity */}
        {!loading && myRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Requests Today</Text>
            {myRequests.slice(0, 5).map((req) => (
              <View key={req.id} style={styles.activityRow}>
                <View style={styles.activityLeft}>
                  <Text style={styles.activityTail}>{req.tailNumber ?? '—'}</Text>
                  <Text style={styles.activityTime}>
                    Engine start: {fmtTime(req.engineStartTime)}
                  </Text>
                </View>
                <StatusBadge status={req.status} />
              </View>
            ))}
          </View>
        )}

        {/* Dev panel */}
        {__DEV__ && (
          <View style={styles.devPanel}>
            <Text style={styles.devTitle}>Dev Panel</Text>
            <View style={styles.devRow}>
              <TouchableOpacity
                style={styles.devBtn}
                onPress={() => void devLoginAs('pilot')}
                disabled={devLoading}
              >
                <Text style={styles.devBtnText}>Dev Pilot</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devBtn}
                onPress={() => void devLoginAs('mechanic')}
                disabled={devLoading}
              >
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    waiting: { bg: colors.yellow + '33', fg: colors.yellow },
    confirmed: { bg: colors.blue + '33', fg: colors.blue },
    active: { bg: colors.green + '33', fg: colors.green },
    completed: { bg: colors.t3 + '55', fg: colors.t2 },
    cancelled: { bg: colors.redD, fg: colors.red },
  }
  const c = map[status] ?? { bg: colors.s3, fg: colors.t2 }
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{status.toUpperCase()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  greeting: { fontSize: font.base, color: colors.t2 },
  name: { fontSize: font.xxl, fontWeight: '800', color: colors.text, marginTop: 2 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orangeD,
    borderWidth: 1,
    borderColor: colors.orange,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 20,
  },
  alertIcon: { fontSize: 20, marginRight: 10 },
  alertText: { flex: 1 },
  alertTitle: { fontSize: font.base, fontWeight: '700', color: colors.orange },
  alertBody: { fontSize: font.sm, color: colors.text, marginTop: 2 },
  alertChevron: { fontSize: 22, color: colors.orange },
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
  activeCard: {
    backgroundColor: colors.s2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green + '66',
    padding: 20,
    marginBottom: 20,
  },
  activeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeCardLabel: { fontSize: font.sm, fontWeight: '700', color: colors.t2, letterSpacing: 1 },
  activeTail: { fontSize: font.xxl, fontWeight: '800', color: colors.text },
  activeType: { fontSize: font.base, color: colors.t2, marginTop: 2, marginBottom: 12 },
  activeRow: { flexDirection: 'row', gap: 24, marginBottom: 16 },
  activeStat: {},
  activeStatLabel: { fontSize: font.sm, color: colors.t2 },
  activeStatValue: { fontSize: font.md, fontWeight: '700', color: colors.text, marginTop: 2 },
  trackBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  trackBtnText: { color: '#fff', fontWeight: '700', fontSize: font.base },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: font.base,
    fontWeight: '700',
    color: colors.t2,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  quickRow: { flexDirection: 'row', gap: 12 },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  quickBtnSecondary: { backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border },
  quickBtnIcon: { fontSize: 22, marginBottom: 6 },
  quickBtnText: { color: colors.text, fontWeight: '700', fontSize: font.sm },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
  },
  statNum: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: font.sm, color: colors.t2, marginTop: 4 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityLeft: {},
  activityTail: { fontSize: font.base, fontWeight: '700', color: colors.text },
  activityTime: { fontSize: font.sm, color: colors.t2, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { fontSize: font.sm, fontWeight: '700' },
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
