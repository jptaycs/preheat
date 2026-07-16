import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Plane, CreditCard, ShieldCheck, Wrench, User as UserIcon } from 'lucide-react-native'
import { useAuth } from '../../src/context/AuthContext'
import { adminApi, ApiError } from '../../src/lib/api'
import type { AdminAircraft, AdminOverview, AdminPayment, AdminUser } from '../../src/lib/api'
import type { ThemeColors } from '../../src/theme'
import { font } from '../../src/theme'
import { useTheme } from '../../src/context/ThemeContext'
import {
  Card,
  Chip,
  LargeTitle,
  ListGroup,
  ListRow,
  SectionHeader,
  StatTile,
  Button,
} from '../../src/components/ui'

type Section = 'users' | 'aircraft' | 'payments'

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const ROLE_ICON = {
  pilot: UserIcon,
  mechanic: Wrench,
  dispatcher: Wrench,
  admin: ShieldCheck,
} as const

export default function AdminScreen() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [section, setSection] = useState<Section>('users')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [aircraft, setAircraft] = useState<AdminAircraft[]>([])
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [paymentAircraftFilter, setPaymentAircraftFilter] = useState<AdminAircraft | null>(null)

  // Add-charge modal state
  const [chargeTarget, setChargeTarget] = useState<AdminAircraft | null>(null)
  const [chargeAmount, setChargeAmount] = useState('')
  const [chargeNotes, setChargeNotes] = useState('')
  const [chargeSaving, setChargeSaving] = useState(false)

  const loadAll = useCallback(async () => {
    setError(null)
    try {
      const [ov, us, ac, pm] = await Promise.all([
        adminApi.overview(),
        adminApi.users(),
        adminApi.aircraft(),
        adminApi.payments(),
      ])
      setOverview(ov)
      setUsers(us)
      setAircraft(ac)
      setPayments(pm)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load admin data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadAll()
    }, [loadAll]),
  )

  if (user?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Admin access required.</Text>
        </View>
      </SafeAreaView>
    )
  }

  function onUserPress(u: AdminUser) {
    if (u.id === user?.id) return
    Alert.alert(u.name, u.email, [
      ...(['pilot', 'mechanic', 'admin'] as const)
        .filter((r) => r !== u.role)
        .map((r) => ({
          text: `Make ${r}`,
          onPress: () => {
            void adminApi
              .updateUserRole(u.id, r)
              .then(loadAll)
              .catch((err: unknown) => {
                Alert.alert('Error', err instanceof ApiError ? err.message : 'Update failed')
              })
          },
        })),
      {
        text: 'Delete user',
        style: 'destructive' as const,
        onPress: () => {
          Alert.alert('Delete user?', `${u.name} and their data will be removed.`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                void adminApi
                  .deleteUser(u.id)
                  .then(loadAll)
                  .catch((err: unknown) => {
                    Alert.alert('Error', err instanceof ApiError ? err.message : 'Delete failed')
                  })
              },
            },
          ])
        },
      },
      { text: 'Cancel', style: 'cancel' as const },
    ])
  }

  function onAircraftPress(a: AdminAircraft) {
    Alert.alert(a.tailNumber, `${a.type} — ${a.ownerName}`, [
      {
        text: 'Add charge',
        onPress: () => {
          setChargeAmount('')
          setChargeNotes('')
          setChargeTarget(a)
        },
      },
      {
        text: 'View payments',
        onPress: () => {
          setPaymentAircraftFilter(a)
          setSection('payments')
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  function onPaymentPress(p: AdminPayment) {
    const actions =
      p.status === 'pending'
        ? [
            { label: 'Mark as paid', status: 'paid' as const },
            { label: 'Waive', status: 'waived' as const },
          ]
        : [{ label: 'Mark as pending', status: 'pending' as const }]
    Alert.alert(`${fmtMoney(p.amountCents)} — ${p.tailNumber}`, p.notes ?? undefined, [
      ...actions.map((a) => ({
        text: a.label,
        onPress: () => {
          void adminApi
            .updatePayment(p.id, a.status)
            .then(loadAll)
            .catch((err: unknown) => {
              Alert.alert('Error', err instanceof ApiError ? err.message : 'Update failed')
            })
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ])
  }

  async function submitCharge() {
    if (!chargeTarget) return
    const dollars = Number(chargeAmount)
    if (!Number.isFinite(dollars) || dollars <= 0) {
      Alert.alert('Invalid amount', 'Enter a charge amount greater than zero.')
      return
    }
    setChargeSaving(true)
    try {
      await adminApi.createPayment({
        aircraftId: chargeTarget.id,
        amountCents: Math.round(dollars * 100),
        notes: chargeNotes.trim() || undefined,
      })
      setChargeTarget(null)
      await loadAll()
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not add charge')
    } finally {
      setChargeSaving(false)
    }
  }

  const visiblePayments = paymentAircraftFilter
    ? payments.filter((p) => p.aircraftId === paymentAircraftFilter.id)
    : payments

  const paymentTone = { pending: 'yellow', paid: 'green', waived: 'neutral' } as const

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LargeTitle title="Admin" subtitle="Users, aircraft & payments" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void loadAll()
            }}
            tintColor={colors.t2}
          />
        }
      >
        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        {/* Overview stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <StatTile label="Users" value={overview ? String(overview.users) : '—'} tone="blue" />
            <StatTile
              label="Aircraft"
              value={overview ? String(overview.aircraft) : '—'}
              tone="orange"
            />
            <StatTile
              label="Outstanding"
              value={overview ? fmtMoney(overview.pendingCents) : '—'}
              tone="yellow"
            />
            <StatTile
              label="Collected"
              value={overview ? fmtMoney(overview.paidCents) : '—'}
              tone="green"
            />
          </View>
        </Card>

        {/* Section chips */}
        <View style={styles.chipRow}>
          <Chip label="Users" active={section === 'users'} onPress={() => setSection('users')} />
          <Chip
            label="Aircraft"
            active={section === 'aircraft'}
            onPress={() => setSection('aircraft')}
          />
          <Chip
            label={
              paymentAircraftFilter ? `Payments · ${paymentAircraftFilter.tailNumber}` : 'Payments'
            }
            active={section === 'payments'}
            onPress={() => {
              if (section === 'payments') setPaymentAircraftFilter(null)
              setSection('payments')
            }}
          />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.t2} />
          </View>
        ) : (
          <>
            {section === 'users' && (
              <View style={styles.section}>
                <SectionHeader title={`All users (${users.length})`} />
                <ListGroup>
                  {users.map((u) => (
                    <ListRow
                      key={u.id}
                      icon={ROLE_ICON[u.role as keyof typeof ROLE_ICON] ?? UserIcon}
                      tone={u.role === 'admin' ? 'green' : u.role === 'pilot' ? 'blue' : 'orange'}
                      title={u.name}
                      subtitle={u.email}
                      value={u.role}
                      showChevron={u.id !== user?.id}
                      onPress={u.id !== user?.id ? () => onUserPress(u) : undefined}
                    />
                  ))}
                </ListGroup>
              </View>
            )}

            {section === 'aircraft' && (
              <View style={styles.section}>
                <SectionHeader title={`All aircraft (${aircraft.length})`} />
                <ListGroup>
                  {aircraft.map((a) => (
                    <ListRow
                      key={a.id}
                      icon={Plane}
                      tone={a.pendingCents > 0 ? 'yellow' : 'blue'}
                      title={a.tailNumber}
                      subtitle={`${a.type} · ${a.ownerName} · ${a.sessionCount} preheat${a.sessionCount === 1 ? '' : 's'}`}
                      value={a.pendingCents > 0 ? `${fmtMoney(a.pendingCents)} due` : 'Paid up'}
                      showChevron
                      onPress={() => onAircraftPress(a)}
                    />
                  ))}
                </ListGroup>
                {aircraft.length === 0 && <Text style={styles.emptyText}>No aircraft yet.</Text>}
              </View>
            )}

            {section === 'payments' && (
              <View style={styles.section}>
                <SectionHeader
                  title={
                    paymentAircraftFilter
                      ? `Payments — ${paymentAircraftFilter.tailNumber}`
                      : `Payments (${visiblePayments.length})`
                  }
                />
                <ListGroup>
                  {visiblePayments.map((p) => (
                    <ListRow
                      key={p.id}
                      icon={CreditCard}
                      tone={paymentTone[p.status]}
                      title={`${fmtMoney(p.amountCents)} — ${p.tailNumber}`}
                      subtitle={p.notes ?? `${p.ownerName} · ${fmtDate(p.createdAt)}`}
                      value={p.status}
                      showChevron
                      onPress={() => onPaymentPress(p)}
                    />
                  ))}
                </ListGroup>
                {visiblePayments.length === 0 && (
                  <Text style={styles.emptyText}>No payments recorded yet.</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add charge modal */}
      <Modal visible={chargeTarget !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Charge {chargeTarget?.tailNumber}</Text>
            <Text style={styles.modalSubtitle}>
              Billed to the aircraft · owner {chargeTarget?.ownerName}
            </Text>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Amount (USD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="25.00"
                placeholderTextColor={colors.t3}
                keyboardType="decimal-pad"
                value={chargeAmount}
                onChangeText={setChargeAmount}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Notes (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Extended preheat"
                placeholderTextColor={colors.t3}
                value={chargeNotes}
                onChangeText={setChargeNotes}
              />
            </View>
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                style={styles.modalBtn}
                onPress={() => setChargeTarget(null)}
              />
              <Button
                title="Add Charge"
                style={styles.modalBtn}
                loading={chargeSaving}
                onPress={() => {
                  void submitCharge()
                }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 16, paddingTop: 4, paddingBottom: 100 },
    centered: { alignItems: 'center', paddingVertical: 40 },

    errorCard: { padding: 14, marginBottom: 12, backgroundColor: colors.redD },
    errorText: { color: colors.red, fontSize: font.sm, fontWeight: '600' },

    statsCard: { padding: 16, marginBottom: 14 },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

    section: { marginBottom: 20 },
    emptyText: {
      textAlign: 'center',
      color: colors.t3,
      fontSize: font.sm,
      paddingVertical: 20,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: { padding: 20 },
    modalTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
    modalSubtitle: { fontSize: font.sm, color: colors.t2, marginTop: 2, marginBottom: 16 },
    modalField: { marginBottom: 14 },
    modalLabel: { fontSize: 12, fontWeight: '600', color: colors.t2, marginBottom: 6 },
    modalInput: {
      backgroundColor: colors.s2,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: font.md,
    },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
    modalBtn: { flex: 1 },
  })
