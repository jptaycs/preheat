import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { preheatRequestsApi, ApiError } from '../../src/lib/api'
import type { PreheatRequest } from '../../src/lib/api'
import { AlertTriangle, Flame, Plane, CheckCircle, XCircle, Check } from 'lucide-react-native'
import { font } from '../../src/theme'
import type { ThemeColors } from '../../src/theme'
import { useTheme } from '../../src/context/ThemeContext'
import { Card, Button, IconGlyph } from '../../src/components/ui'

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

function getConfirmPending(requests: PreheatRequest[]): PreheatRequest[] {
  const now = Date.now()
  return requests.filter((r) => {
    if (r.status !== 'waiting') return false
    if (__DEV__) return true // skip time window check in dev
    const opens = new Date(r.confirmOpensAt).getTime()
    const deadline = new Date(r.confirmDeadline).getTime()
    return now >= opens && now <= deadline
  })
}

function CountdownRing({ deadline }: { deadline: string }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const ms = new Date(deadline).getTime() - Date.now()
    return Math.max(0, Math.floor(ms / 1000))
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = new Date(deadline).getTime() - Date.now()
      setSecondsLeft(Math.max(0, Math.floor(ms / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const expired = secondsLeft === 0
  const urgent = secondsLeft < 300
  const displayColor = expired ? colors.red : urgent ? colors.red : colors.orange

  return (
    <View style={styles.ringWrap}>
      <View style={[styles.ringOuter, { borderColor: displayColor + '33' }]}>
        <View style={[styles.ringInner, { borderColor: displayColor + '66' }]}>
          <Text style={[styles.ringNum, { color: displayColor }]}>
            {expired
              ? '00:00'
              : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}
          </Text>
          <Text style={styles.ringLabel}>{expired ? 'expired' : 'remaining'}</Text>
        </View>
      </View>
      <Text style={styles.ringHint}>Time to respond before auto-cancel</Text>
    </View>
  )
}

export default function ConfirmScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PreheatRequest[]>([])
  const [confirming, setConfirming] = useState<Set<string>>(new Set())
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchPending = useCallback(async () => {
    try {
      setError(null)
      const all = await preheatRequestsApi.list({ date: todayISO() })
      if (!isMounted.current) return
      setPending(getConfirmPending(all))
    } catch (e) {
      if (!isMounted.current) return
      setError(e instanceof ApiError ? e.message : 'Failed to load requests')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      void fetchPending()
    }, [fetchPending]),
  )

  async function handleConfirm(req: PreheatRequest) {
    setConfirming((prev) => new Set(prev).add(req.id))
    try {
      await preheatRequestsApi.confirm(req.id)
      setConfirmed((prev) => new Set(prev).add(req.id))
      setTimeout(() => {
        if (!isMounted.current) return
        setPending((prev) => prev.filter((r) => r.id !== req.id))
        setConfirmed((prev) => {
          const n = new Set(prev)
          n.delete(req.id)
          return n
        })
      }, 1500)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Confirmation failed')
    } finally {
      setConfirming((prev) => {
        const n = new Set(prev)
        n.delete(req.id)
        return n
      })
    }
  }

  async function handleCancel(req: PreheatRequest) {
    setCancelError(null)
    setCancelling(true)
    try {
      await preheatRequestsApi.cancel(req.id)
      router.replace('/(app)')
    } catch (e) {
      if (isMounted.current) {
        setCancelError(e instanceof ApiError ? e.message : 'Cancellation failed')
        setCancelling(false)
      }
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue} />
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <Card style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => void fetchPending()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading confirmations"
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </Card>
      </SafeAreaView>
    )
  }

  if (pending.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <CheckCircle size={48} color={colors.green} />
          <Text style={styles.emptyTitle}>No confirmations needed</Text>
          <Text style={styles.emptyBody}>
            You'll be notified when your confirmation window opens.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Show the first pending request in the dramatic confirm UI
  const req = pending[0]
  const isConfirming = confirming.has(req.id)
  const isJustConfirmed = confirmed.has(req.id)

  if (isJustConfirmed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirmedWrap}>
          <IconGlyph icon={Check} tone="green" size={80} />
          <Text style={styles.confirmedTitle}>Confirmed!</Text>
          <Text style={styles.confirmedBody}>
            Your preheat slot for {req.tailNumber} is secured.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Dramatic red header */}
        <View style={styles.redHeader}>
          <IconGlyph icon={AlertTriangle} tone="red" size={72} />
          <Text style={styles.actionLabel}>ACTION REQUIRED</Text>
          <Text style={styles.headerTitle}>Confirm Your{'\n'}Flight Attendance</Text>
          <Text style={styles.headerSub}>
            Your flight departs soon.{'\n'}Confirm you are heading to the aircraft.
          </Text>
        </View>

        {/* Countdown ring */}
        <CountdownRing deadline={req.confirmDeadline} />

        {/* Flight summary card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTail}>{req.tailNumber ?? '—'}</Text>
            <View style={styles.queueBadge}>
              <Text style={styles.queueBadgeText}>Queue #{req.queuePosition}</Text>
            </View>
          </View>
          <View style={styles.summaryGrid}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Flame size={10} color={colors.t3} />
                <Text style={styles.gridLabel}>Preheat</Text>
              </View>
              <Text style={[styles.gridValue, { color: colors.orange }]}>
                {fmtTime(req.assignedTime)}
              </Text>
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Plane size={10} color={colors.t3} />
                <Text style={styles.gridLabel}>Engine Start</Text>
              </View>
              <Text style={styles.gridValue}>{fmtTime(req.engineStartTime)}</Text>
            </View>
          </View>
        </Card>

        {/* Warning alert */}
        <View style={styles.warningAlert}>
          <AlertTriangle size={18} color={colors.red} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningAlertTitle}>Do not miss this window</Text>
            <Text style={styles.warningAlertMsg}>
              If not confirmed in time, your preheat slot will be canceled and the next aircraft
              will take your position.
            </Text>
          </View>
        </View>

        {/* Confirm button */}
        <Button
          title="I'm Arriving — Confirm"
          icon={CheckCircle}
          loading={isConfirming}
          onPress={() => void handleConfirm(req)}
          style={styles.confirmBtn}
        />

        {/* Cancel section */}
        <Text style={styles.cancelHint}>I won't be able to make it</Text>
        <TouchableOpacity
          style={[styles.cancelBtn, cancelling && { opacity: 0.5 }]}
          onPress={() => void handleCancel(req)}
          disabled={cancelling}
          accessibilityRole="button"
          accessibilityLabel={`Cancel preheat request for ${req.tailNumber ?? 'aircraft'}`}
          accessibilityState={{ disabled: cancelling, busy: cancelling }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <XCircle size={16} color={colors.red} />
            <Text style={styles.cancelBtnText}>
              {cancelling ? 'Cancelling…' : 'Cancel My Preheat Request'}
            </Text>
          </View>
        </TouchableOpacity>
        {cancelError && <Text style={styles.cancelErrorText}>{cancelError}</Text>}

        {/* Show remaining if more than 1 */}
        {pending.length > 1 && (
          <Text style={styles.moreText}>
            +{pending.length - 1} more confirmation{pending.length > 2 ? 's' : ''} pending
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingBottom: 40 },

    // Error
    errorBox: {
      margin: 20,
      backgroundColor: colors.redD,
      alignItems: 'center',
      shadowOpacity: 0,
      elevation: 0,
    },
    errorText: { color: colors.red, fontSize: font.base, marginBottom: 10, textAlign: 'center' },
    retryText: { color: colors.red, textDecorationLine: 'underline', fontSize: font.base },

    // Empty
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyTitle: { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: 8 },
    emptyBody: { fontSize: font.base, color: colors.t2, textAlign: 'center', lineHeight: 22 },

    // Confirmed animation
    confirmedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 4 },
    confirmedTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.green,
      marginTop: 16,
      marginBottom: 8,
    },
    confirmedBody: { fontSize: font.base, color: colors.t2, textAlign: 'center' },

    // Red header
    redHeader: {
      alignItems: 'center',
      paddingTop: 28,
      paddingBottom: 0,
      paddingHorizontal: 20,
      gap: 4,
    },
    actionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: colors.red,
      marginTop: 14,
    },
    headerTitle: {
      fontSize: 21,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 26,
    },
    headerSub: {
      fontSize: 13,
      color: colors.t2,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },

    // Countdown ring
    ringWrap: { alignItems: 'center', marginTop: 22, marginBottom: 16 },
    ringOuter: {
      width: 130,
      height: 130,
      borderRadius: 65,
      borderWidth: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringInner: {
      width: 110,
      height: 110,
      borderRadius: 55,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
    },
    ringNum: { fontSize: 28, fontWeight: '700', lineHeight: 32 },
    ringLabel: { fontSize: 11, color: colors.t2, fontWeight: '600', marginTop: 2 },
    ringHint: { fontSize: 12, color: colors.t3, marginTop: 8 },

    // Summary card
    summaryCard: {
      marginHorizontal: 20,
      marginBottom: 14,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    summaryTail: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
    queueBadge: {
      backgroundColor: colors.orangeD,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    queueBadgeText: { fontSize: 10, fontWeight: '700', color: colors.orange },
    summaryGrid: {
      flexDirection: 'row',
      gap: 20,
    },
    gridLabel: {
      fontSize: 10,
      color: colors.t3,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 3,
    },
    gridValue: { fontSize: 17, fontWeight: '600', color: colors.text },

    // Warning alert
    warningAlert: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 11,
      backgroundColor: colors.redD,
      borderRadius: 16,
      padding: 13,
      marginHorizontal: 20,
      marginBottom: 18,
    },
    warningAlertTitle: { fontSize: 13, fontWeight: '700', color: colors.red, marginBottom: 2 },
    warningAlertMsg: { fontSize: 12, color: colors.t2, lineHeight: 18 },

    // Buttons
    confirmBtn: { marginHorizontal: 20 },
    cancelHint: {
      fontSize: 12,
      color: colors.t3,
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    cancelBtn: {
      backgroundColor: colors.redD,
      borderRadius: 18,
      paddingVertical: 15,
      alignItems: 'center',
      marginHorizontal: 20,
    },
    cancelBtnText: { color: colors.red, fontWeight: '600', fontSize: 14 },
    cancelErrorText: {
      color: colors.red,
      fontSize: font.sm,
      textAlign: 'center',
      marginTop: 8,
      marginHorizontal: 20,
    },
    moreText: {
      fontSize: 12,
      color: colors.t3,
      textAlign: 'center',
      marginTop: 16,
    },
  })
