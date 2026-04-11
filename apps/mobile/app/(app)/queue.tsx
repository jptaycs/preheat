import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { queueApi, preheatRequestsApi, ApiError } from '../../src/lib/api'
import type { QueueEntry, QueueResponse } from '../../src/lib/api'
import { useWebSocket } from '../../src/hooks/useWebSocket'
import { colors, font, radius } from '../../src/theme'

type FilterStatus = 'all' | 'waiting' | 'confirmed' | 'active' | 'completed'

function addDays(base: Date, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function isInConfirmWindow(entry: QueueEntry): boolean {
  if (entry.status !== 'waiting') return false
  const now = Date.now()
  const opens = new Date(entry.confirmOpensAt).getTime()
  const deadline = new Date(entry.confirmDeadline).getTime()
  return now >= opens && now <= deadline
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  waiting: { bg: colors.yellow + '33', fg: colors.yellow },
  confirmed: { bg: colors.blue + '33', fg: colors.blue },
  active: { bg: colors.green + '33', fg: colors.green },
  completed: { bg: colors.t3 + '55', fg: colors.t2 },
  cancelled: { bg: colors.redD, fg: colors.red },
}

export default function QueueScreen() {
  const router = useRouter()
  const today = new Date()
  const dates = [addDays(today, 0), addDays(today, 1), addDays(today, 2)]

  const [selectedDate, setSelectedDate] = useState(dates[0])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueData, setQueueData] = useState<QueueResponse | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  const fetchQueue = useCallback(async (date: string) => {
    try {
      setError(null)
      const data = await queueApi.get({ date })
      setQueueData(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    void fetchQueue(selectedDate)
  }, [selectedDate, fetchQueue])

  useWebSocket({
    'queue.updated': () => {
      void fetchQueue(selectedDate)
    },
  })

  async function handleConfirm(entry: QueueEntry) {
    setConfirming(entry.id)
    try {
      await preheatRequestsApi.confirm(entry.id)
      await fetchQueue(selectedDate)
    } catch {
      // ignore
    } finally {
      setConfirming(null)
    }
  }

  const entries = queueData?.entries ?? []
  const filtered = filter === 'all' ? entries : entries.filter((e) => e.status === filter)

  const stats = queueData?.stats

  function handleCardPress(item: QueueEntry) {
    if (item.status === 'active') {
      router.push(`/(app)/track?requestId=${item.id}`)
    } else if (item.isMine && item.status === 'waiting') {
      router.push('/(app)/confirm')
    } else if (item.isMine) {
      router.push(`/(app)/track?requestId=${item.id}`)
    }
  }

  function renderItem({ item, index }: { item: QueueEntry; index: number }) {
    const c = STATUS_COLORS[item.status] ?? { bg: colors.s3, fg: colors.t2 }
    const inWindow = isInConfirmWindow(item)
    const tappable = item.isMine || item.status === 'active'

    return (
      <TouchableOpacity
        style={[styles.card, item.isMine && styles.cardMine]}
        onPress={() => handleCardPress(item)}
        activeOpacity={tappable ? 0.75 : 1}
        disabled={!tappable}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.position}>#{item.queuePosition ?? index + 1}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.tail}>{item.tailNumber}</Text>
            {item.isMine && (
              <View style={styles.mineBadge}>
                <Text style={styles.mineText}>MINE</Text>
              </View>
            )}
          </View>
          <Text style={styles.aircraftType}>{item.aircraftType}</Text>
          <Text style={styles.timeRow}>Engine start: {fmtTime(item.engineStartTime)}</Text>
          {item.status === 'waiting' && (
            <Text style={styles.confirmInfo}>
              Confirm window: {fmtTime(item.confirmOpensAt)} – {fmtTime(item.confirmDeadline)}
            </Text>
          )}
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
            <Text style={[styles.statusText, { color: c.fg }]}>{item.status.toUpperCase()}</Text>
          </View>
          {item.isMine && inWindow && (
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => void handleConfirm(item)}
              disabled={confirming === item.id}
            >
              {confirming === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Date chips */}
      <View style={styles.dateRow}>
        {dates.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.dateChip, selectedDate === d && styles.dateChipActive]}
            onPress={() => setSelectedDate(d)}
          >
            <Text style={[styles.dateChipText, selectedDate === d && styles.dateChipTextActive]}>
              {d === dates[0] ? 'Today' : fmtDate(d)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats bar */}
      {stats && (
        <View style={styles.statsBar}>
          <StatPill
            label="Total"
            value={(stats.waiting + stats.confirmed + stats.active + stats.completed).toString()}
            color={colors.t2}
          />
          <StatPill label="Wait" value={stats.waiting.toString()} color={colors.yellow} />
          <StatPill label="Conf" value={stats.confirmed.toString()} color={colors.blue} />
          <StatPill label="Active" value={stats.active.toString()} color={colors.green} />
          <StatPill label="Done" value={stats.completed.toString()} color={colors.t3} />
        </View>
      )}

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(['all', 'waiting', 'confirmed', 'active', 'completed'] as FilterStatus[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No entries for this filter</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statPillNum, { color }]}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  dateRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  dateChipText: { fontSize: font.sm, color: colors.t2, fontWeight: '600' },
  dateChipTextActive: { color: '#fff' },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.s1,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  statPill: { alignItems: 'center' },
  statPillNum: { fontSize: font.md, fontWeight: '800' },
  statPillLabel: { fontSize: 10, color: colors.t3, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.blueD, borderColor: colors.blue },
  filterText: { fontSize: font.sm, color: colors.t2 },
  filterTextActive: { color: colors.blue, fontWeight: '700' },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    padding: 14,
    gap: 12,
  },
  cardMine: { borderColor: colors.blue + '88' },
  cardLeft: { justifyContent: 'center', width: 32 },
  position: { fontSize: font.md, fontWeight: '800', color: colors.t2, textAlign: 'center' },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  tail: { fontSize: font.md, fontWeight: '700', color: colors.text },
  mineBadge: {
    backgroundColor: colors.blue + '33',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  mineText: { fontSize: 10, color: colors.blue, fontWeight: '700' },
  aircraftType: { fontSize: font.sm, color: colors.t2, marginBottom: 4 },
  timeRow: { fontSize: font.sm, color: colors.t2 },
  confirmInfo: { fontSize: font.sm, color: colors.yellow, marginTop: 4 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 10, fontWeight: '700' },
  confirmBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: font.sm, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { margin: 16, backgroundColor: colors.redD, borderRadius: radius.md, padding: 16 },
  errorText: { color: colors.red, fontSize: font.base, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: colors.t3, fontSize: font.base },
})
