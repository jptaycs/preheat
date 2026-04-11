import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { preheatRequestsApi, ApiError } from '../../src/lib/api'
import type { PreheatRequest } from '../../src/lib/api'
import { colors, font, radius } from '../../src/theme'

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
    const opens = new Date(r.confirmOpensAt).getTime()
    const deadline = new Date(r.confirmDeadline).getTime()
    return now >= opens && now <= deadline
  })
}

function Countdown({ deadline }: { deadline: string }) {
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
  const urgent = secondsLeft < 120

  return (
    <Text
      style={[
        styles.countdown,
        urgent && styles.countdownUrgent,
        expired && styles.countdownExpired,
      ]}
    >
      {expired ? 'EXPIRED' : `${mins}:${secs.toString().padStart(2, '0')} remaining`}
    </Text>
  )
}

export default function ConfirmScreen() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PreheatRequest[]>([])
  const [confirming, setConfirming] = useState<Set<string>>(new Set())
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle}>Confirmations</Text>
        <TouchableOpacity onPress={() => void fetchPending()}>
          <Text style={styles.refreshBtn}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void fetchPending()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : pending.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>No confirmations needed</Text>
          <Text style={styles.emptyBody}>
            You'll be notified when your confirmation window opens.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Text style={styles.subtitle}>
            {pending.length} request{pending.length > 1 ? 's' : ''} need your confirmation
          </Text>
          {pending.map((req) => {
            const isConfirming = confirming.has(req.id)
            const isJustConfirmed = confirmed.has(req.id)
            return (
              <View key={req.id} style={styles.card}>
                {isJustConfirmed ? (
                  <View style={styles.successOverlay}>
                    <Text style={styles.successIcon}>✓</Text>
                    <Text style={styles.successText}>Confirmed!</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.cardHeader}>
                      <Text style={styles.tailNumber}>{req.tailNumber ?? '—'}</Text>
                      {req.aircraftType ? (
                        <Text style={styles.aircraftType}>{req.aircraftType}</Text>
                      ) : null}
                    </View>
                    <View style={styles.cardMeta}>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Engine Start</Text>
                        <Text style={styles.metaValue}>{fmtTime(req.engineStartTime)}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Assigned Time</Text>
                        <Text style={styles.metaValue}>{fmtTime(req.assignedTime)}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Queue Position</Text>
                        <Text style={styles.metaValue}>#{req.queuePosition}</Text>
                      </View>
                    </View>
                    <View style={styles.deadlineRow}>
                      <Text style={styles.deadlineLabel}>
                        Deadline: {fmtTime(req.confirmDeadline)}
                      </Text>
                      <Countdown deadline={req.confirmDeadline} />
                    </View>
                    <TouchableOpacity
                      style={[styles.confirmBtn, isConfirming && styles.confirmBtnDisabled]}
                      onPress={() => void handleConfirm(req)}
                      disabled={isConfirming}
                    >
                      {isConfirming ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.confirmBtnText}>Confirm My Slot</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )
          })}
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
  screenTitle: { fontSize: font.xxl, fontWeight: '800', color: colors.text },
  refreshBtn: { fontSize: font.base, color: colors.blue },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    margin: 20,
    backgroundColor: colors.redD,
    borderRadius: radius.md,
    padding: 20,
    alignItems: 'center',
  },
  errorText: { color: colors.red, fontSize: font.base, marginBottom: 10, textAlign: 'center' },
  retryText: { color: colors.red, textDecorationLine: 'underline', fontSize: font.base },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyBody: { fontSize: font.base, color: colors.t2, textAlign: 'center', lineHeight: 22 },
  listContent: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: font.base, color: colors.t2, marginBottom: 16 },
  card: {
    backgroundColor: colors.s1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.orange + '88',
    padding: 20,
    marginBottom: 16,
    minHeight: 120,
  },
  cardHeader: { marginBottom: 16 },
  tailNumber: { fontSize: font.xxl, fontWeight: '800', color: colors.text },
  aircraftType: { fontSize: font.base, color: colors.t2, marginTop: 2 },
  cardMeta: { gap: 8, marginBottom: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: font.base, color: colors.t2 },
  metaValue: { fontSize: font.base, fontWeight: '700', color: colors.text },
  deadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.s2,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  deadlineLabel: { fontSize: font.sm, color: colors.t2 },
  countdown: { fontSize: font.base, fontWeight: '700', color: colors.yellow },
  countdownUrgent: { color: colors.orange },
  countdownExpired: { color: colors.red },
  confirmBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: font.md },
  successOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  successIcon: { fontSize: 40, marginBottom: 8 },
  successText: { fontSize: font.xl, fontWeight: '700', color: colors.green },
})
