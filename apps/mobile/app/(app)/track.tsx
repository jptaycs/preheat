import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { preheatRequestsApi, sessionsApi, ApiError } from '../../src/lib/api'
import type { PreheatRequest, SessionDetail } from '../../src/lib/api'
import { useWebSocket } from '../../src/hooks/useWebSocket'
import { ArrowLeft, RefreshCw, CheckCircle, Plane, Wrench, Clock, Check } from 'lucide-react-native'
import { DurationPicker } from '../../src/components/DurationPicker'
import { CountdownTimer } from '../../src/components/CountdownTimer'
import { colors, font, radius } from '../../src/theme'

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmtTimeShort(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

// ── Shared components ─────────────────────────────────────────────────────────

function HeatGauge({ tempC, session }: { tempC: number | null; session?: SessionDetail | null }) {
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulseAnim])

  const displayTemp = tempC !== null ? `${Number(tempC).toFixed(0)}°C` : '--'

  return (
    <View style={styles.gaugeCard}>
      <View style={styles.gaugePillRow}>
        <View style={styles.gaugePill}>
          <View style={[styles.gaugePillDot, { backgroundColor: colors.orange }]} />
          <Text style={styles.gaugePillText}>Preheating In Progress</Text>
        </View>
      </View>

      <Animated.View style={[styles.gaugeRing, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.gaugeInner}>
          <Text style={styles.gaugePercent}>{displayTemp}</Text>
          <Text style={styles.gaugeLabel}>current</Text>
        </View>
      </Animated.View>

      {/* Temperature stats grid */}
      <View style={styles.tempGrid}>
        <View style={styles.tempGridItem}>
          <Text style={styles.tempGridLabel}>Current</Text>
          <Text style={[styles.tempGridValue, { color: colors.orange }]}>
            {tempC !== null ? `${Number(tempC).toFixed(0)}°C` : '--'}
          </Text>
        </View>
        <View style={styles.tempGridItem}>
          <Text style={styles.tempGridLabel}>Target</Text>
          <Text style={styles.tempGridValue}>+5°C</Text>
        </View>
        <View style={styles.tempGridItem}>
          <Text style={styles.tempGridLabel}>Readings</Text>
          <Text style={[styles.tempGridValue, { color: colors.blue }]}>
            {session?.readings.length ?? 0}
          </Text>
        </View>
      </View>
    </View>
  )
}

function SessionTimeline({ session }: { session: SessionDetail }) {
  const readings = [...session.readings].reverse()
  return (
    <View style={styles.timelineSection}>
      <Text style={styles.sectionTitle}>PROGRESS TIMELINE</Text>

      {/* Start */}
      <View style={styles.tlItem}>
        <View style={styles.tlLeft}>
          <View
            style={[styles.tlDot, { borderColor: colors.green, backgroundColor: colors.green }]}
          />
          <View style={[styles.tlLine, { backgroundColor: colors.green }]} />
        </View>
        <View style={styles.tlBody}>
          <Text style={styles.tlTime}>{fmtTimeShort(session.startedAt)}</Text>
          <View style={[styles.tlCard, { borderColor: colors.greenD }]}>
            <View style={styles.tlCardRow}>
              <Text style={styles.tlCardTitle}>Session Started</Text>
              <View style={[styles.tlBadge, { backgroundColor: colors.greenD }]}>
                <Text style={[styles.tlBadgeText, { color: colors.green }]}>Done</Text>
              </View>
            </View>
            <Text style={styles.tlCardSub}>Preheat initiated by mechanic</Text>
          </View>
        </View>
      </View>

      {/* Readings */}
      {readings.map((r, i) => {
        const isLatest = i === 0
        const dotColor = isLatest ? colors.orange : colors.border
        return (
          <View key={r.id} style={styles.tlItem}>
            <View style={styles.tlLeft}>
              <View
                style={[
                  styles.tlDot,
                  {
                    borderColor: dotColor,
                    backgroundColor: isLatest ? dotColor : colors.bg,
                  },
                ]}
              />
              <View style={[styles.tlLine, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.tlBody}>
              <Text style={styles.tlTime}>{fmtTimeShort(r.recordedAt)}</Text>
              <View style={[styles.tlCard, isLatest && { borderColor: colors.orange }]}>
                <View style={styles.tlCardRow}>
                  <Text style={styles.tlCardTitle}>
                    Temperature: {Number(r.tempCelsius).toFixed(1)}°C
                  </Text>
                  {isLatest && (
                    <View style={[styles.tlBadge, { backgroundColor: colors.orangeD }]}>
                      <Text style={[styles.tlBadgeText, { color: colors.orange }]}>Latest</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.tlCardSub}>Reading {session.readings.length - i}</Text>
              </View>
            </View>
          </View>
        )
      })}

      {/* Completed or pending */}
      {session.completedAt ? (
        <View style={styles.tlItem}>
          <View style={styles.tlLeft}>
            <View
              style={[styles.tlDot, { borderColor: colors.green, backgroundColor: colors.green }]}
            />
          </View>
          <View style={styles.tlBody}>
            <Text style={styles.tlTime}>{fmtTimeShort(session.completedAt)}</Text>
            <View style={[styles.tlCard, { borderColor: colors.greenD }]}>
              <View style={styles.tlCardRow}>
                <Text style={styles.tlCardTitle}>Preheat Complete</Text>
                <View style={[styles.tlBadge, { backgroundColor: colors.greenD }]}>
                  <Text style={[styles.tlBadgeText, { color: colors.green }]}>Done</Text>
                </View>
              </View>
              <Text style={styles.tlCardSub}>Aircraft ready for departure</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.tlItem}>
          <View style={styles.tlLeft}>
            <View style={[styles.tlDot, { borderColor: colors.border }]} />
          </View>
          <View style={styles.tlBody}>
            <Text style={styles.tlTime}>Pending</Text>
            <View style={styles.tlCard}>
              <View style={styles.tlCardRow}>
                <Text style={[styles.tlCardTitle, { color: colors.t3 }]}>Preheat Complete</Text>
                <View style={[styles.tlBadge, { backgroundColor: colors.s3 }]}>
                  <Text style={[styles.tlBadgeText, { color: colors.t2 }]}>Pending</Text>
                </View>
              </View>
              <Text style={[styles.tlCardSub, { color: colors.t3 }]}>
                Aircraft ready for departure
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function TrackScreen() {
  const { user } = useAuth()
  const params = useLocalSearchParams<{
    requestId?: string
    tailNumber?: string
    aircraftType?: string
    pilotName?: string
  }>()

  if (user?.role === 'mechanic' && params.requestId) {
    return (
      <MechanicTrack
        requestId={params.requestId}
        tailNumber={params.tailNumber ?? ''}
        aircraftType={params.aircraftType ?? ''}
        pilotName={params.pilotName ?? ''}
      />
    )
  }
  return <PilotTrack requestId={params.requestId} />
}

// ── Mechanic view ─────────────────────────────────────────────────────────────

function MechanicTrack({
  requestId,
  tailNumber,
  aircraftType,
  pilotName,
}: {
  requestId: string
  tailNumber: string
  aircraftType: string
  pilotName: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [tempInput, setTempInput] = useState('')
  const [starting, setStarting] = useState(false)
  const [logging, setLogging] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [duration, setDuration] = useState(20)
  const [editingDuration, setEditingDuration] = useState(false)
  const [timerExpired, setTimerExpired] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchSession = useCallback(async () => {
    try {
      setError(null)
      const sess = await sessionsApi.getByRequest(requestId)
      if (isMounted.current) setSession(sess)
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 404) {
        if (isMounted.current) setSession(null)
      } else {
        if (isMounted.current)
          setError(e instanceof ApiError ? e.message : 'Failed to load session')
      }
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    void fetchSession()
  }, [fetchSession])

  useEffect(() => {
    if (session?.durationMinutes) {
      setDuration(session.durationMinutes)
    }
  }, [session?.durationMinutes])

  // Polling fallback — keeps UI in sync even if WebSocket events are missed
  useEffect(() => {
    if (session?.completedAt) return
    const interval = setInterval(() => {
      void fetchSession()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchSession, session?.completedAt])

  useWebSocket({
    'temp.updated': () => {
      void fetchSession()
    },
    'session.started': () => {
      void fetchSession()
    },
    'session.completed': () => {
      void fetchSession()
    },
    'queue.updated': () => {
      void fetchSession()
    },
    'timer.updated': () => {
      void fetchSession()
    },
    'timer.expired': () => {
      setTimerExpired(true)
    },
  })

  async function handleStart() {
    setStarting(true)
    try {
      await sessionsApi.start(requestId, duration)
      await fetchSession()
    } catch (e) {
      if (isMounted.current) setError(e instanceof ApiError ? e.message : 'Failed to start session')
    } finally {
      if (isMounted.current) setStarting(false)
    }
  }

  async function handleLogTemp() {
    const temp = parseFloat(tempInput)
    if (isNaN(temp) || temp < -60 || temp > 60) {
      setError('Enter a valid temperature between -60 and 60°C')
      return
    }
    if (!session) return
    setLogging(true)
    try {
      await sessionsApi.addReading(session.id, temp)
      if (isMounted.current) setTempInput('')
      await fetchSession()
    } catch (e) {
      if (isMounted.current)
        setError(e instanceof ApiError ? e.message : 'Failed to log temperature')
    } finally {
      if (isMounted.current) setLogging(false)
    }
  }

  async function handleComplete() {
    if (!session) return
    setCompleting(true)
    try {
      await sessionsApi.complete(session.id)
      await fetchSession()
    } catch (e) {
      if (isMounted.current)
        setError(e instanceof ApiError ? e.message : 'Failed to complete session')
    } finally {
      if (isMounted.current) setCompleting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back to queue"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={18} color={colors.t2} />
            <Text style={styles.backBtn}>Queue</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Preheat Tracking</Text>
        <TouchableOpacity
          onPress={() => void fetchSession()}
          accessibilityRole="button"
          accessibilityLabel="Refresh session data"
        >
          <RefreshCw size={18} color={colors.blue} />
        </TouchableOpacity>
      </View>
      <Text style={styles.headerSub}>{tailNumber} · Live Status</Text>

      {/* Aircraft info card */}
      <View style={styles.aircraftInfoCard}>
        <Text style={styles.aircraftTail}>{tailNumber}</Text>
        {!!aircraftType && <Text style={styles.aircraftTypeText}>{aircraftType}</Text>}
        {!!pilotName && <Text style={styles.pilotNameText}>Pilot: {pilotName}</Text>}
      </View>

      {error && (
        <TouchableOpacity style={styles.errorBox} onPress={() => setError(null)}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText}>Tap to dismiss</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue} size="large" />
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      ) : session?.completedAt ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.completeCard}>
            <CheckCircle size={40} color={colors.green} />
            <Text style={styles.completeTitle}>Preheat Complete!</Text>
            <Text style={styles.completeBody}>{tailNumber} is ready for the pilot.</Text>
          </View>
          <SessionTimeline session={session} />
        </ScrollView>
      ) : session ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <CountdownTimer
              startedAt={session.startedAt}
              durationMinutes={duration}
              editable
              onEdit={() => setEditingDuration(true)}
              onExpired={() => setTimerExpired(true)}
            />

            {timerExpired && (
              <View style={styles.expiredBanner}>
                <Text style={styles.expiredText}>Timer is up! Check the aircraft temperature.</Text>
              </View>
            )}

            {editingDuration && (
              <View style={styles.editDurationCard}>
                <Text style={styles.editDurationTitle}>ADJUST TIMER</Text>
                <DurationPicker value={duration} onChange={setDuration} />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={styles.editDurationCancel}
                    onPress={() => setEditingDuration(false)}
                  >
                    <Text style={styles.editDurationCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editDurationSave}
                    onPress={() => {
                      if (session) {
                        void sessionsApi.updateDuration(session.id, duration).then(() => {
                          setEditingDuration(false)
                          setTimerExpired(false)
                        })
                      }
                    }}
                  >
                    <Text style={styles.editDurationSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <HeatGauge tempC={session.currentTempCelsius} session={session} />

            {/* Temperature input */}
            <View style={styles.tempInputCard}>
              <Text style={styles.tempInputLabel}>LOG TEMPERATURE READING</Text>
              <View style={styles.tempInputRow}>
                <TextInput
                  style={styles.tempInput}
                  value={tempInput}
                  onChangeText={setTempInput}
                  placeholder="-20.5"
                  placeholderTextColor={colors.t3}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <Text style={styles.tempUnit}>°C</Text>
                <TouchableOpacity
                  style={[styles.logBtn, logging && styles.btnDisabled]}
                  onPress={() => void handleLogTemp()}
                  disabled={logging}
                  accessibilityRole="button"
                  accessibilityLabel="Log temperature reading"
                  accessibilityState={{ disabled: logging, busy: logging }}
                >
                  {logging ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.logBtnText}>Log</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.completeBtn, completing && styles.btnDisabled]}
              onPress={() => void handleComplete()}
              disabled={completing}
              accessibilityRole="button"
              accessibilityLabel="Mark preheat session as complete"
              accessibilityState={{ disabled: completing, busy: completing }}
            >
              {completing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Check size={18} color="#fff" />
                  <Text style={styles.completeBtnText}>Complete Session</Text>
                </View>
              )}
            </TouchableOpacity>

            {session.readings.length > 0 && <SessionTimeline session={session} />}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.emptyState}>
          <Wrench size={56} color={colors.orange} />
          <Text style={styles.emptyTitle}>Ready to Preheat</Text>
          <Text style={styles.emptyBody}>
            {tailNumber} is confirmed. Tap Start when you're at the aircraft.
          </Text>
          <DurationPicker label="PREHEAT DURATION" value={duration} onChange={setDuration} />
          <TouchableOpacity
            style={[styles.startBtn, starting && styles.btnDisabled]}
            onPress={() => void handleStart()}
            disabled={starting}
            accessibilityRole="button"
            accessibilityLabel={`Start preheat for ${tailNumber}`}
            accessibilityState={{ disabled: starting, busy: starting }}
          >
            {starting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startBtnText}>Start Preheat</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

// ── Pilot view ────────────────────────────────────────────────────────────────

function PilotTrack({ requestId }: { requestId?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeRequest, setActiveRequest] = useState<PreheatRequest | null>(null)
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [timerExpired, setTimerExpired] = useState(false)
  const isMounted = useRef(true)
  const lastActiveIdRef = useRef<string | null>(requestId ?? null)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchSession = useCallback(async () => {
    try {
      setError(null)

      // If we know the requestId directly, skip the list call and poll the session straight
      if (lastActiveIdRef.current) {
        const knownId = lastActiveIdRef.current
        const req = await preheatRequestsApi.get(knownId)
        if (isMounted.current) setActiveRequest(req)
        try {
          const sess = await sessionsApi.getByRequest(knownId)
          if (isMounted.current) setSession(sess)
        } catch {
          if (isMounted.current) setSession(null)
        }
        return
      }

      // Fallback: discover active request from list (e.g. navigated from home)
      const requests = await preheatRequestsApi.list()
      const target = requests.find((r) => r.status === 'active' || r.status === 'confirmed')
      if (!target) {
        if (isMounted.current) {
          setActiveRequest(null)
          setSession(null)
        }
        return
      }

      lastActiveIdRef.current = target.id
      if (isMounted.current) setActiveRequest(target)
      try {
        const sess = await sessionsApi.getByRequest(target.id)
        if (isMounted.current) setSession(sess)
      } catch {
        if (isMounted.current) setSession(null)
      }
    } catch (e) {
      if (isMounted.current) setError(e instanceof ApiError ? e.message : 'Failed to load data')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, []) // intentionally empty — lastActiveIdRef is a ref, not state

  useEffect(() => {
    void fetchSession()
  }, [fetchSession])

  // Polling fallback — keeps UI in sync even if WebSocket events are missed
  useEffect(() => {
    if (sessionComplete || session?.completedAt) return
    const interval = setInterval(() => {
      void fetchSession()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchSession, sessionComplete, session?.completedAt])

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
    'timer.updated': () => {
      void fetchSession()
    },
    'timer.expired': () => {
      setTimerExpired(true)
    },
  })

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.t2} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Preheat Tracking</Text>
        <TouchableOpacity onPress={() => void fetchSession()}>
          <RefreshCw size={18} color={colors.blue} />
        </TouchableOpacity>
      </View>
      {activeRequest && (
        <Text style={styles.headerSub}>{activeRequest.tailNumber ?? ''} · Live Status</Text>
      )}

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
          <Plane size={56} color={colors.blue} />
          <Text style={styles.emptyTitle}>No active preheat</Text>
          <Text style={styles.emptyBody}>Request a preheat to see live session tracking here.</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/(app)/request')}>
            <Text style={styles.startBtnText}>Request Preheat</Text>
          </TouchableOpacity>
        </View>
      ) : sessionComplete || session?.completedAt ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.completeCard}>
            <CheckCircle size={40} color={colors.green} />
            <Text style={styles.completeTitle}>Preheat Complete!</Text>
            <Text style={styles.completeBody}>
              Your aircraft {activeRequest.tailNumber ?? ''} is ready.
            </Text>
          </View>
          {session && <SessionTimeline session={session} />}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {session && (
            <CountdownTimer
              startedAt={session.startedAt}
              durationMinutes={session.durationMinutes}
              onExpired={() => setTimerExpired(true)}
            />
          )}

          {timerExpired && (
            <View style={styles.expiredBanner}>
              <Text style={styles.expiredText}>
                Preheat time is up! Your aircraft should be ready soon.
              </Text>
            </View>
          )}

          {session ? (
            <>
              <HeatGauge tempC={session.currentTempCelsius} session={session} />

              {/* Info card */}
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <View>
                    <Text style={styles.infoCardSectionLabel}>ESTIMATED COMPLETION</Text>
                    <Text style={styles.infoCardValue}>In progress</Text>
                    <Text style={styles.infoCardSub}>
                      {session.readings.length} reading{session.readings.length !== 1 ? 's' : ''}{' '}
                      logged
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.infoCardSmallLabel}>Queue Position</Text>
                    <Text style={[styles.infoCardSmallValue, { color: colors.blue }]}>
                      #{activeRequest.queuePosition}
                    </Text>
                  </View>
                </View>
              </View>

              <SessionTimeline session={session} />
            </>
          ) : (
            <View style={styles.waitingCard}>
              <Clock size={32} color={colors.t2} />
              <Text style={styles.waitingTitle}>Waiting for mechanic</Text>
              <Text style={styles.waitingText}>
                Your preheat session hasn't started yet. You'll see live updates here once the
                mechanic begins.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { fontSize: 20, color: colors.t2 },
  screenTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  refreshBtn: { fontSize: 20, color: colors.blue },
  headerSub: {
    fontSize: 13,
    color: colors.t2,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.t2, fontSize: font.base },
  errorBox: {
    margin: 20,
    backgroundColor: colors.redD,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
  },
  errorText: { color: colors.red, fontSize: font.base, marginBottom: 6 },
  retryText: { color: colors.red, textDecorationLine: 'underline', fontSize: font.sm },
  content: { padding: 20, paddingBottom: 40 },

  // Aircraft info (mechanic)
  aircraftInfoCard: {
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  aircraftTail: { fontSize: font.xxl, fontWeight: '800', color: colors.text },
  aircraftTypeText: { fontSize: font.base, color: colors.t2, marginTop: 2 },
  pilotNameText: { fontSize: font.sm, color: colors.t3, marginTop: 4 },

  // Empty / start
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
  startBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: colors.blue,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: font.base },

  // Gauge card
  gaugeCard: {
    backgroundColor: '#1A1E2E',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.orange,
    padding: 22,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: colors.orange,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  gaugePillRow: { marginBottom: 16 },
  gaugePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.orangeD,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  gaugePillDot: { width: 6, height: 6, borderRadius: 3 },
  gaugePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  gaugeRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 5,
    borderColor: colors.orange + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeInner: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 3,
    borderColor: colors.orange + '66',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s2,
  },
  gaugePercent: { fontSize: 30, fontWeight: '900', color: colors.orange },
  gaugeLabel: { fontSize: 11, color: colors.t2, fontWeight: '600', marginTop: 2 },
  tempGrid: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  tempGridItem: { flex: 1, alignItems: 'center' },
  tempGridLabel: {
    fontSize: 10,
    color: colors.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  tempGridValue: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2 },

  // Temperature input (mechanic)
  tempInputCard: {
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  tempInputLabel: {
    fontSize: 11,
    color: colors.t2,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  tempInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tempInput: {
    flex: 1,
    backgroundColor: colors.s2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: font.md,
    color: colors.text,
    fontWeight: '700',
  },
  tempUnit: { fontSize: font.base, color: colors.t2, fontWeight: '600' },
  logBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 64,
  },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: font.base },

  // Complete button
  completeBtn: {
    backgroundColor: colors.green,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  completeBtnText: { color: '#fff', fontWeight: '800', fontSize: font.base },
  btnDisabled: { opacity: 0.5 },

  // Complete card
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

  // Info card (pilot)
  infoCard: {
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoCardSectionLabel: {
    fontSize: 10,
    color: colors.t3,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  infoCardValue: { fontSize: 22, fontWeight: '800', color: colors.green },
  infoCardSub: { fontSize: 12, color: colors.t2, marginTop: 2 },
  infoCardSmallLabel: { fontSize: 11, color: colors.t3 },
  infoCardSmallValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  // Waiting card (pilot)
  waitingCard: {
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  waitingIcon: { fontSize: 32, marginBottom: 10 },
  waitingTitle: { fontSize: font.md, fontWeight: '700', color: colors.text, marginBottom: 6 },
  waitingText: { color: colors.t2, fontSize: font.base, textAlign: 'center', lineHeight: 22 },

  // Timeline
  timelineSection: { marginTop: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.t3,
    marginBottom: 16,
  },
  tlItem: { flexDirection: 'row', gap: 12 },
  tlLeft: { alignItems: 'center', width: 32 },
  tlDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2.5,
    backgroundColor: colors.bg,
    zIndex: 1,
    marginTop: 2,
  },
  tlLine: { width: 2, flex: 1, minHeight: 16, marginVertical: 3 },
  tlBody: { flex: 1, paddingBottom: 18 },
  tlTime: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.t2,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  tlCard: {
    backgroundColor: colors.s2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
  },
  tlCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tlCardTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  tlCardSub: { fontSize: 12, color: colors.t2, marginTop: 2 },
  tlBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tlBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  // Expired banner
  expiredBanner: {
    backgroundColor: colors.redD,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  expiredText: { color: colors.red, fontWeight: '700', fontSize: font.base },

  // Edit duration card (mechanic)
  editDurationCard: {
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.blue,
    padding: 16,
    marginBottom: 14,
  },
  editDurationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.t2,
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  editDurationCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editDurationCancelText: { color: colors.t2, fontWeight: '600' },
  editDurationSave: {
    flex: 1,
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editDurationSaveText: { color: '#fff', fontWeight: '700' },
})
