import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Animated,
} from 'react-native'
import { useRouter } from 'expo-router'
import { preheatRequestsApi, sessionsApi, ApiError } from '../../src/lib/api'
import type { PreheatRequest, SessionDetail, SessionReading } from '../../src/lib/api'
import { useWebSocket } from '../../src/hooks/useWebSocket'
import { colors, font, radius } from '../../src/theme'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

function TempGauge({ tempC }: { tempC: number | null }) {
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulseAnim])

  const displayTemp = tempC !== null ? tempC.toFixed(1) : '--'
  const tempColor =
    tempC === null
      ? colors.t3
      : tempC < -20
        ? colors.blue
        : tempC < 0
          ? colors.yellow
          : colors.orange

  return (
    <View style={styles.gaugeContainer}>
      <Animated.View
        style={[
          styles.gaugePulse,
          { transform: [{ scale: pulseAnim }], borderColor: tempColor + '44' },
        ]}
      >
        <View style={[styles.gaugeInner, { borderColor: tempColor + '88' }]}>
          <Text style={[styles.gaugeTemp, { color: tempColor }]}>{displayTemp}°C</Text>
          <Text style={styles.gaugeLabel}>Current Temperature</Text>
        </View>
      </Animated.View>
    </View>
  )
}

function ReadingRow({ reading, index }: { reading: SessionReading; index: number }) {
  return (
    <View style={styles.readingRow}>
      <View style={styles.readingDot} />
      <View style={styles.readingInfo}>
        <Text style={styles.readingTemp}>{reading.tempCelsius.toFixed(1)}°C</Text>
        <Text style={styles.readingTime}>{fmtTime(reading.recordedAt)}</Text>
      </View>
      <Text style={styles.readingIndex}>Reading {index + 1}</Text>
    </View>
  )
}

export default function TrackScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeRequest, setActiveRequest] = useState<PreheatRequest | null>(null)
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [sessionComplete, setSessionComplete] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchSession = useCallback(async () => {
    try {
      setError(null)
      const requests = await preheatRequestsApi.list({ date: todayISO() })
      const active = requests.find((r) => r.status === 'active' || r.status === 'confirmed')
      if (!active) {
        if (isMounted.current) {
          setActiveRequest(null)
          setSession(null)
          setLoading(false)
        }
        return
      }
      setActiveRequest(active)
      try {
        const sess = await sessionsApi.getByRequest(active.id)
        if (isMounted.current) setSession(sess)
      } catch {
        // session may not exist yet
        if (isMounted.current) setSession(null)
      }
    } catch (e) {
      if (isMounted.current) setError(e instanceof ApiError ? e.message : 'Failed to load session')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSession()
  }, [fetchSession])

  useWebSocket({
    'temp.updated': () => {
      void fetchSession()
    },
    'session.completed': () => {
      if (isMounted.current) setSessionComplete(true)
      void fetchSession()
    },
    'queue.updated': () => {
      void fetchSession()
    },
  })

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle}>Track Session</Text>
        <TouchableOpacity onPress={() => void fetchSession()}>
          <Text style={styles.refreshBtn}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue} size="large" />
          <Text style={styles.loadingText}>Loading session data...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void fetchSession()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : !activeRequest ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✈️</Text>
          <Text style={styles.emptyTitle}>No active preheat</Text>
          <Text style={styles.emptyBody}>Request a preheat to see live session tracking here.</Text>
          <TouchableOpacity style={styles.requestBtn} onPress={() => router.push('/(app)/request')}>
            <Text style={styles.requestBtnText}>Request Preheat</Text>
          </TouchableOpacity>
        </View>
      ) : sessionComplete || session?.completedAt ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.completeCard}>
            <Text style={styles.completeIcon}>🟢</Text>
            <Text style={styles.completeTitle}>Preheat Complete!</Text>
            <Text style={styles.completeBody}>
              Your aircraft {activeRequest.tailNumber ?? ''} is ready.
            </Text>
          </View>
          {session && <SessionTimeline session={session} />}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Status header */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusDot, { backgroundColor: colors.orange }]} />
              <Text style={styles.statusLabel}>Heating In Progress</Text>
            </View>
            <Text style={styles.statusTail}>{activeRequest.tailNumber ?? '—'}</Text>
            {activeRequest.aircraftType ? (
              <Text style={styles.statusType}>{activeRequest.aircraftType}</Text>
            ) : null}
          </View>

          {/* Temperature gauge */}
          <TempGauge tempC={session?.currentTempCelsius ?? null} />

          {/* Session info */}
          {session && (
            <>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Started</Text>
                  <Text style={styles.infoValue}>{fmtTime(session.startedAt)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Readings</Text>
                  <Text style={styles.infoValue}>{session.readings.length}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Queue Position</Text>
                  <Text style={styles.infoValue}>#{activeRequest.queuePosition}</Text>
                </View>
              </View>

              <SessionTimeline session={session} />
            </>
          )}

          {!session && (
            <View style={styles.waitingCard}>
              <Text style={styles.waitingText}>Waiting for session to start...</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function SessionTimeline({ session }: { session: SessionDetail }) {
  const readings = [...session.readings].reverse()
  return (
    <View style={styles.timelineSection}>
      <Text style={styles.sectionTitle}>Session Timeline</Text>
      <View style={styles.timelineStart}>
        <View style={styles.timelineDotGreen} />
        <Text style={styles.timelineStartText}>
          Session started —{' '}
          {new Date(session.startedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      {readings.map((r, i) => (
        <ReadingRow key={r.id} reading={r} index={session.readings.length - 1 - i} />
      ))}
      {session.completedAt && (
        <View style={styles.timelineEnd}>
          <View style={styles.timelineDotGreen} />
          <Text style={styles.timelineEndText}>
            Completed —{' '}
            {new Date(session.completedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      )}
    </View>
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
  refreshBtn: { fontSize: font.base, color: colors.blue },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.t2, fontSize: font.base },
  errorBox: {
    margin: 20,
    backgroundColor: colors.redD,
    borderRadius: radius.md,
    padding: 20,
    alignItems: 'center',
  },
  errorText: { color: colors.red, fontSize: font.base, marginBottom: 10 },
  retryText: { color: colors.red, textDecorationLine: 'underline', fontSize: font.base },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyBody: {
    fontSize: font.base,
    color: colors.t2,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  requestBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  requestBtnText: { color: '#fff', fontWeight: '700', fontSize: font.base },
  content: { padding: 20, paddingBottom: 40 },
  completeCard: {
    backgroundColor: colors.greenD,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.green,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  completeIcon: { fontSize: 40, marginBottom: 12 },
  completeTitle: { fontSize: font.xl, fontWeight: '800', color: colors.green, marginBottom: 8 },
  completeBody: { fontSize: font.base, color: colors.text, textAlign: 'center' },
  statusCard: {
    backgroundColor: colors.s1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.orange + '66',
    padding: 20,
    marginBottom: 20,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: font.base, color: colors.orange, fontWeight: '700' },
  statusTail: { fontSize: font.xxl, fontWeight: '800', color: colors.text },
  statusType: { fontSize: font.base, color: colors.t2, marginTop: 2 },
  gaugeContainer: { alignItems: 'center', marginVertical: 24 },
  gaugePulse: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeInner: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s2,
  },
  gaugeTemp: { fontSize: 34, fontWeight: '800' },
  gaugeLabel: { fontSize: font.sm, color: colors.t2, marginTop: 4 },
  infoCard: {
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: font.base, color: colors.t2 },
  infoValue: { fontSize: font.base, fontWeight: '700', color: colors.text },
  waitingCard: {
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  waitingText: { color: colors.t2, fontSize: font.base },
  timelineSection: { marginTop: 4 },
  sectionTitle: {
    fontSize: font.base,
    fontWeight: '700',
    color: colors.t2,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  timelineStart: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  timelineDotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
  timelineStartText: { fontSize: font.base, color: colors.t2 },
  timelineEnd: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  timelineEndText: { fontSize: font.base, color: colors.green, fontWeight: '700' },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    marginLeft: 4,
    paddingHorizontal: 14,
    gap: 12,
  },
  readingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange },
  readingInfo: { flex: 1 },
  readingTemp: { fontSize: font.base, fontWeight: '700', color: colors.text },
  readingTime: { fontSize: font.sm, color: colors.t2, marginTop: 2 },
  readingIndex: { fontSize: font.sm, color: colors.t3 },
})
