import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { aircraftApi, ApiError } from '../../src/lib/api'
import type { AircraftItem } from '../../src/lib/api'
import { colors, font, radius } from '../../src/theme'

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  pilot: { bg: colors.blue + '33', fg: colors.blue },
  mechanic: { bg: colors.orange + '33', fg: colors.orange },
  admin: { bg: colors.green + '33', fg: colors.green },
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
  const [signingOut, setSigningOut] = useState(false)

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
    }, [fetchAircraft]),
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
          try {
            await aircraftApi.remove(item.id)
            setAircraft((prev) => prev.filter((a) => a.id !== item.id))
          } catch {
            // ignore
          } finally {
            setDeletingId(null)
          }
        },
      },
    ])
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
    }
  }

  const roleMeta = ROLE_COLORS[user?.role ?? ''] ?? { bg: colors.s3, fg: colors.t2 }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Profile</Text>

        {/* User info card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name ?? '—'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? '—'}</Text>
            <View style={styles.userMeta}>
              <View style={[styles.roleBadge, { backgroundColor: roleMeta.bg }]}>
                <Text style={[styles.roleText, { color: roleMeta.fg }]}>
                  {(user?.role ?? 'unknown').toUpperCase()}
                </Text>
              </View>
              {user?.licenseNumber ? (
                <Text style={styles.licenseText}>#{user.licenseNumber}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Aircraft section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Aircraft</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setShowAddForm((v) => !v)
                setAddError(null)
              }}
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
            <View style={styles.center}>
              <ActivityIndicator color={colors.blue} />
            </View>
          ) : aircraftError ? (
            <View style={styles.inlineError}>
              <Text style={styles.inlineErrorText}>{aircraftError}</Text>
              <TouchableOpacity onPress={() => void fetchAircraft()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : aircraft.length === 0 ? (
            <View style={styles.aircraftEmpty}>
              <Text style={styles.aircraftEmptyText}>No aircraft added yet</Text>
            </View>
          ) : (
            aircraft.map((item) => (
              <View key={item.id} style={styles.aircraftCard}>
                <View style={styles.aircraftIcon}>
                  <Text style={styles.aircraftIconText}>✈️</Text>
                </View>
                <View style={styles.aircraftInfo}>
                  <Text style={styles.aircraftTail}>{item.tailNumber}</Text>
                  <Text style={styles.aircraftType}>{item.type}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => void handleDelete(item)}
                  disabled={deletingId === item.id}
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
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => void handleSignOut()}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color={colors.red} />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 60 },
  screenTitle: { fontSize: font.xxl, fontWeight: '800', color: colors.text, marginBottom: 20 },
  userCard: {
    flexDirection: 'row',
    backgroundColor: colors.s1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 28,
    gap: 16,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.blueD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: font.xxl, fontWeight: '800', color: colors.blue },
  userInfo: { flex: 1 },
  userName: { fontSize: font.lg, fontWeight: '700', color: colors.text, marginBottom: 4 },
  userEmail: { fontSize: font.sm, color: colors.t2, marginBottom: 8 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  roleText: { fontSize: font.sm, fontWeight: '700' },
  licenseText: { fontSize: font.sm, color: colors.t3 },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
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
  center: { alignItems: 'center', paddingVertical: 20 },
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
    marginBottom: 8,
    gap: 12,
  },
  aircraftIcon: {
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
  aircraftType: { fontSize: font.sm, color: colors.t2, marginTop: 2 },
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
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: colors.redD,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: { color: colors.red, fontWeight: '700', fontSize: font.base },
})
