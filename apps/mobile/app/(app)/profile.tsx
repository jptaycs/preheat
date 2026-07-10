import React, { useCallback, useMemo, useState } from 'react'
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
import { Plane, Wrench, Settings, Sun, Moon } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { font } from '../../src/theme'
import type { ThemeColors } from '../../src/theme'
import { useTheme } from '../../src/context/ThemeContext'
import { Card, Button, SectionHeader, ListGroup, ListRow } from '../../src/components/ui'

const getRoleMeta = (
  colors: ThemeColors,
): Record<string, { bg: string; fg: string; label: string; Icon: LucideIcon }> => ({
  pilot: { bg: colors.blueD, fg: colors.blue, label: 'Pilot Role', Icon: Plane },
  mechanic: { bg: colors.orangeD, fg: colors.orange, label: 'Mechanic Role', Icon: Wrench },
  admin: { bg: colors.greenD, fg: colors.green, label: 'Admin Role', Icon: Settings },
})

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const { colors, mode, setMode } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const ROLE_META = useMemo(() => getRoleMeta(colors), [colors])

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

  const roleMeta = ROLE_META[user?.role ?? ''] ?? {
    bg: colors.s3,
    fg: colors.t2,
    label: (user?.role ?? 'unknown').toUpperCase(),
    Icon: Plane,
  }

  const switchProps = {
    trackColor: { false: colors.s3, true: colors.blue },
    thumbColor: '#fff',
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
        <View style={styles.section}>
          <SectionHeader title="Account" style={styles.sectionHeader} />
          <ListGroup>
            <ListRow title="Full Name" value={user?.name ?? '—'} showChevron />
            <ListRow title="Email" value={user?.email ?? '—'} showChevron />
            <ListRow
              title="My Aircraft"
              value={aircraft.map((a) => a.tailNumber).join(', ') || 'None added'}
              showChevron
            />
          </ListGroup>
        </View>

        {/* Notifications section */}
        <View style={styles.section}>
          <SectionHeader title="Notifications" style={styles.sectionHeader} />
          <ListGroup>
            <ListRow
              title="Schedule Alerts"
              subtitle="When preheat is assigned"
              trailing={
                <Switch
                  value={notifPrefs.scheduleAlerts}
                  onValueChange={(v) => void handleTogglePref('scheduleAlerts', v)}
                  {...switchProps}
                />
              }
            />
            <ListRow
              title="Confirmation Reminder"
              subtitle="30 min before departure"
              trailing={
                <Switch
                  value={notifPrefs.confirmReminder}
                  onValueChange={(v) => void handleTogglePref('confirmReminder', v)}
                  {...switchProps}
                />
              }
            />
            <ListRow
              title="Preheat Progress"
              subtitle="Started / Completed"
              trailing={
                <Switch
                  value={notifPrefs.preheatProgress}
                  onValueChange={(v) => void handleTogglePref('preheatProgress', v)}
                  {...switchProps}
                />
              }
            />
            <ListRow
              title="Queue Changes"
              subtitle="Position updates"
              trailing={
                <Switch
                  value={notifPrefs.queueChanges}
                  onValueChange={(v) => void handleTogglePref('queueChanges', v)}
                  {...switchProps}
                />
              }
            />
          </ListGroup>
        </View>

        {/* Appearance section */}
        <View style={styles.section}>
          <SectionHeader title="Appearance" style={styles.sectionHeader} />
          <ListGroup>
            <ListRow
              icon={mode === 'light' ? Sun : Moon}
              tone="neutral"
              title="Light Mode"
              subtitle="Use a light color theme"
              trailing={
                <Switch
                  value={mode === 'light'}
                  onValueChange={(v) => setMode(v ? 'light' : 'dark')}
                  accessibilityLabel="Toggle light mode"
                  {...switchProps}
                />
              }
            />
          </ListGroup>
        </View>

        {/* Aircraft section */}
        <View style={styles.section}>
          <View style={styles.aircraftHeader}>
            <SectionHeader title="My Aircraft" style={styles.sectionHeaderNoPad} />
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
            <Card style={styles.addForm}>
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
              <Button
                title="Add Aircraft"
                loading={adding}
                onPress={() => void handleAddAircraft()}
                style={{ marginTop: 8 }}
              />
            </Card>
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
            <ListGroup>
              {aircraft.map((item) => (
                <ListRow
                  key={item.id}
                  icon={Plane}
                  tone="neutral"
                  title={item.tailNumber}
                  subtitle={item.type}
                  trailing={
                    deletingId === item.id ? (
                      <ActivityIndicator size="small" color={colors.red} />
                    ) : (
                      <TouchableOpacity
                        onPress={() => void handleDelete(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.tailNumber}`}
                      >
                        <Text style={styles.deleteBtnText}>Remove</Text>
                      </TouchableOpacity>
                    )
                  }
                />
              ))}
            </ListGroup>
          )}

          {deleteError && (
            <View style={styles.inlineError}>
              <Text style={styles.inlineErrorText}>{deleteError}</Text>
            </View>
          )}
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <ListGroup>
            <ListRow
              title="Sign Out"
              destructive
              onPress={() => void handleSignOut()}
              trailing={signingOut ? <ActivityIndicator color={colors.red} /> : undefined}
            />
          </ListGroup>
        </View>

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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 100 },

    // Profile header
    profileHeader: {
      alignItems: 'center',
      paddingTop: 28,
      paddingBottom: 22,
      paddingHorizontal: 20,
    },
    avatarLg: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.blueD,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
      marginBottom: 14,
    },
    avatarLgText: { fontSize: 28, fontWeight: '700', color: colors.blue },
    profileName: { fontSize: 22, fontWeight: '700', color: colors.text },
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
    statNum: { fontSize: 18, fontWeight: '700', color: colors.text },
    statLabel: { fontSize: 11, color: colors.t3 },

    section: { paddingHorizontal: 20, marginBottom: 18 },
    sectionHeader: { marginLeft: 4 },
    sectionHeaderNoPad: { marginLeft: 4, marginBottom: 0 },

    // Aircraft section
    aircraftHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    addBtn: {
      backgroundColor: colors.blueD,
      borderRadius: 99,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    addBtnText: { color: colors.blue, fontSize: font.sm, fontWeight: '600' },
    addForm: { marginBottom: 12, gap: 6 },
    formLabel: { fontSize: font.sm, color: colors.t2, marginBottom: 4, marginTop: 6 },
    input: {
      backgroundColor: colors.s2,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: font.base,
    },
    formError: { color: colors.red, fontSize: font.sm, marginTop: 4 },

    centerPad: { alignItems: 'center', paddingVertical: 20 },
    inlineError: { alignItems: 'center', paddingVertical: 12, gap: 8 },
    inlineErrorText: { color: colors.red, fontSize: font.base },
    retryText: { color: colors.red, textDecorationLine: 'underline', fontSize: font.sm },

    aircraftEmpty: { paddingVertical: 20, alignItems: 'center' },
    aircraftEmptyText: { color: colors.t3, fontSize: font.base },
    deleteBtnText: { color: colors.red, fontSize: font.sm, fontWeight: '600' },

    // Privacy + version
    privacyLink: {
      fontSize: 12,
      color: colors.t3,
      textAlign: 'center',
      marginTop: 4,
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
