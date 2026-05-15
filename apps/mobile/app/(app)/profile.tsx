import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { aircraftApi, preferencesApi, ApiError } from '../../src/lib/api'
import type { AircraftItem, NotificationPrefs } from '../../src/lib/api'
import { Plane, Wrench, Settings, ChevronRight } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { colors, font, radius } from '../../src/theme'

const ROLE_COLORS: Record<string, { bg: string; fg: string; label: string; Icon: LucideIcon }> = {
  pilot: { bg: colors.blueD, fg: colors.blue, label: 'Pilot Role', Icon: Plane },
  mechanic: { bg: colors.orangeD, fg: colors.orange, label: 'Mechanic Role', Icon: Wrench },
  admin: { bg: colors.greenD, fg: colors.green, label: 'Admin Role', Icon: Settings },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export default function ProfileScreen() {
  const { user, logout } = useAuth()

  const [aircraft, setAircraft] = useState<AircraftItem[]>([])
  const [loadingAircraft, setLoadingAircraft] = useState(true)
  const [aircraftError, setAircraftError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [tailNumber, setTailNumber] = useState('')
  const [aircraftType, setAircraftType] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  // Notification preferences (loaded from API)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    scheduleAlerts: true,
    confirmReminder: true,
    preheatProgress: true,
    queueChanges: false,
  })

  const fetchAircraft = useCallback(async () => {
    try {
      setAircraftError(null)
      const list = await aircraftApi.list()
      setAircraft(list)
    } catch (e) {
      setAircraftError(e instanceof ApiError ? e.message : 'Failed to load aircraft')
    } finally {
      setLoadingAircraft(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoadingAircraft(true)
      void fetchAircraft()
      if (user?.notificationPrefs) {
        setNotifPrefs(user.notificationPrefs)
      }
    }, [fetchAircraft, user?.notificationPrefs]),
  )

  async function handleAddAircraft() {
    if (!tailNumber.trim()) {
      setAddError('Tail number is required')
      return
    }
    if (!aircraftType.trim()) {
      setAddError('Aircraft type is required')
      return
    }
    setAdding(true)
    setAddError(null)
    try {
      await aircraftApi.create({ tailNumber: tailNumber.trim(), type: aircraftType.trim() })
      setTailNumber('')
      setAircraftType('')
      setShowAddForm(false)
      await fetchAircraft()
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : 'Failed to add aircraft')
    } finally {
      setAdding(false)
    }
  }

  function handleDelete(item: AircraftItem) {
    Alert.alert('Remove Aircraft', `Remove ${item.tailNumber} from your aircraft?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onPress: async () => {
          setDeletingId(item.id)
          setDeleteError(null)
          try {
            await aircraftApi.remove(item.id)
            setAircraft((prev) => prev.filter((a) => a.id !== item.id))
          } catch (e) {
            setDeleteError(e instanceof ApiError ? e.message : 'Failed to remove aircraft')
          } finally {
            setDeletingId(null)
          }
        },
      },
    ])
  }

  async function handleTogglePref(key: keyof NotificationPrefs, value: boolean) {
    const prev = { ...notifPrefs }
    setNotifPrefs({ ...notifPrefs, [key]: value })
    try {
      await preferencesApi.update({ [key]: value })
    } catch {
      setNotifPrefs(prev)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
    }
  }

  const roleMeta = ROLE_COLORS[user?.role ?? ''] ?? {
    bg: colors.s3,
    fg: colors.t2,
    label: (user?.role ?? 'unknown').toUpperCase(),
    Icon: Plane,
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile header - centered */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>{getInitials(user?.name ?? 'P')}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
          {user?.licenseNumber && (
            <Text style={styles.profileLicense}>License #{user.licenseNumber}</Text>
          )}
          <View style={[styles.rolePill, { backgroundColor: roleMeta.bg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <roleMeta.Icon size={12} color={roleMeta.fg} />
              <Text style={[styles.rolePillText, { color: roleMeta.fg }]}>{roleMeta.label}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{aircraft.length}</Text>
              <Text style={styles.statLabel}>Aircraft</Text>
            </View>
          </View>
        </View>

        {/* Account section */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            <View>
              <Text style={styles.settingsLabel}>Full Name</Text>
              <Text style={styles.settingsValue}>{user?.name ?? '—'}</Text>
            </View>
            <ChevronRight size={16} color={colors.t3} />
          </View>
          <View style={styles.settingsRow}>
            <View>
              <Text style={styles.settingsLabel}>Email</Text>
              <Text style={styles.settingsValue}>{user?.email ?? '—'}</Text>
            </View>
            <ChevronRight size={16} color={colors.t3} />
          </View>
          <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.settingsLabel}>My Aircraft</Text>
              <Text style={styles.settingsValue}>
                {aircraft.map((a) => a.tailNumber).join(', ') || 'None added'}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.t3} />
          </View>
        </View>

        {/* Notifications section */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.settingsCard}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsLabel}>Schedule Alerts</Text>
              <Text style={styles.settingsSub}>When preheat is assigned</Text>
            </View>
            <Switch
              value={notifPrefs.scheduleAlerts}
              onValueChange={(v) => void handleTogglePref('scheduleAlerts', v)}
              trackColor={{ false: colors.s3, true: colors.blue }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsLabel}>Confirmation Reminder</Text>
              <Text style={styles.settingsSub}>30 min before departure</Text>
            </View>
            <Switch
              value={notifPrefs.confirmReminder}
              onValueChange={(v) => void handleTogglePref('confirmReminder', v)}
              trackColor={{ false: colors.s3, true: colors.blue }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsLabel}>Preheat Progress</Text>
              <Text style={styles.settingsSub}>Started / Completed</Text>
            </View>
            <Switch
              value={notifPrefs.preheatProgress}
              onValueChange={(v) => void handleTogglePref('preheatProgress', v)}
              trackColor={{ false: colors.s3, true: colors.blue }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsLabel}>Queue Changes</Text>
              <Text style={styles.settingsSub}>Position updates</Text>
            </View>
            <Switch
              value={notifPrefs.queueChanges}
              onValueChange={(v) => void handleTogglePref('queueChanges', v)}
              trackColor={{ false: colors.s3, true: colors.blue }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Aircraft section */}
        <View style={styles.aircraftHeader}>
          <Text style={styles.sectionTitle}>MY AIRCRAFT</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setShowAddForm((v) => !v)
              setAddError(null)
            }}
            accessibilityRole="button"
            accessibilityLabel={showAddForm ? 'Cancel adding aircraft' : 'Add new aircraft'}
          >
            <Text style={styles.addBtnText}>{showAddForm ? 'Cancel' : '+ Add'}</Text>
          </TouchableOpacity>
        </View>

        {/* Add form */}
        {showAddForm && (
          <View style={styles.addForm}>
            <Text style={styles.formLabel}>Tail Number</Text>
            <TextInput
              style={styles.input}
              value={tailNumber}
              onChangeText={setTailNumber}
              placeholder="e.g. N12345"
              placeholderTextColor={colors.t3}
              autoCapitalize="characters"
            />
            <Text style={styles.formLabel}>Aircraft Type</Text>
            <TextInput
              style={styles.input}
              value={aircraftType}
              onChangeText={setAircraftType}
              placeholder="e.g. Cessna 172"
              placeholderTextColor={colors.t3}
            />
            {addError ? <Text style={styles.formError}>{addError}</Text> : null}
            <TouchableOpacity
              style={[styles.submitBtn, adding && styles.submitBtnDisabled]}
              onPress={() => void handleAddAircraft()}
              disabled={adding}
              accessibilityRole="button"
              accessibilityLabel="Save new aircraft"
              accessibilityState={{ disabled: adding, busy: adding }}
            >
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Add Aircraft</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {loadingAircraft ? (
          <View style={styles.centerPad}>
            <ActivityIndicator color={colors.blue} />
          </View>
        ) : aircraftError ? (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{aircraftError}</Text>
            <TouchableOpacity onPress={() => void fetchAircraft()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : aircraft.length === 0 && !showAddForm ? (
          <View style={styles.aircraftEmpty}>
            <Text style={styles.aircraftEmptyText}>No aircraft added yet</Text>
          </View>
        ) : (
          aircraft.map((item) => (
            <View key={item.id} style={styles.aircraftCard}>
              <View style={styles.aircraftIconCircle}>
                <Plane size={18} color={colors.t2} />
              </View>
              <View style={styles.aircraftInfo}>
                <Text style={styles.aircraftTail}>{item.tailNumber}</Text>
                <Text style={styles.aircraftTypeName}>{item.type}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => void handleDelete(item)}
                disabled={deletingId === item.id}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.tailNumber}`}
                accessibilityState={{
                  disabled: deletingId === item.id,
                  busy: deletingId === item.id,
                }}
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.red} />
                ) : (
                  <Text style={styles.deleteBtnText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}

        {deleteError && (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{deleteError}</Text>
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => void handleSignOut()}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out of your account"
          accessibilityState={{ disabled: signingOut, busy: signingOut }}
        >
          {signingOut ? (
            <ActivityIndicator color={colors.red} />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void Linking.openURL('https://preheat.app/privacy')}
          accessibilityRole="link"
          accessibilityLabel="View Privacy Policy"
        >
          <Text style={styles.privacyLink}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>Preheat Scheduler v1.0.0 · © 2026</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 60 },

  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  avatarLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blueD,
    borderWidth: 3,
    borderColor: colors.blue,
    shadowColor: colors.blue,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 14,
  },
  avatarLgText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 20, fontWeight: '800', color: colors.text },
  profileLicense: { fontSize: 13, color: colors.t2, marginTop: 3 },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 99,
    marginTop: 10,
  },
  rolePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    marginTop: 16,
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.t3 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },

  // Section title
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.t3,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 20,
  },

  // Settings card
  settingsCard: {
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  settingsValue: { fontSize: 12, color: colors.t2, marginTop: 2 },
  settingsSub: { fontSize: 12, color: colors.t2, marginTop: 2 },
  chevron: { fontSize: 18, color: colors.t3 },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Aircraft section
  aircraftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginBottom: 0,
  },
  addBtn: {
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addBtnText: { color: colors.blue, fontSize: font.sm, fontWeight: '600' },
  addForm: {
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 6,
  },
  formLabel: { fontSize: font.sm, color: colors.t2, marginBottom: 4, marginTop: 6 },
  input: {
    backgroundColor: colors.s2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: font.base,
  },
  formError: { color: colors.red, fontSize: font.sm, marginTop: 4 },
  submitBtn: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: font.base },

  centerPad: { alignItems: 'center', paddingVertical: 20 },
  inlineError: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  inlineErrorText: { color: colors.red, fontSize: font.base },
  retryText: { color: colors.red, textDecorationLine: 'underline', fontSize: font.sm },

  aircraftEmpty: { paddingVertical: 20, alignItems: 'center' },
  aircraftEmptyText: { color: colors.t3, fontSize: font.base },
  aircraftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.s1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 12,
  },
  aircraftIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.s2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aircraftIconText: { fontSize: 18 },
  aircraftInfo: { flex: 1 },
  aircraftTail: { fontSize: font.base, fontWeight: '700', color: colors.text },
  aircraftTypeName: { fontSize: font.sm, color: colors.t2, marginTop: 2 },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.redD,
    minWidth: 64,
    alignItems: 'center',
  },
  deleteBtnText: { color: colors.red, fontSize: font.sm, fontWeight: '600' },

  // Sign out
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: colors.redD,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
  },
  signOutText: { color: colors.red, fontWeight: '700', fontSize: font.base },

  // Privacy + version
  privacyLink: {
    fontSize: 12,
    color: colors.t3,
    textAlign: 'center',
    marginTop: 16,
    textDecorationLine: 'underline',
  },
  versionText: {
    fontSize: 11,
    color: colors.t3,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
})
