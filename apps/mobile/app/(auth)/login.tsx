import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Link } from 'expo-router'
import { useMemo, useState } from 'react'
import * as LocalAuthentication from 'expo-local-authentication'
import { useAuth, ApiError } from '../../src/context/AuthContext'
import type { LoginRole } from '../../src/context/AuthContext'
import { font } from '../../src/theme'
import type { ThemeColors } from '../../src/theme'
import { useTheme } from '../../src/context/ThemeContext'
import { Flame, Plane, Fingerprint, Wrench, Zap, ShieldCheck } from 'lucide-react-native'
import { Card, Button, Chip, IconGlyph } from '../../src/components/ui'

const ROLE_OPTIONS: Array<{ key: LoginRole; label: string; subtitle: string }> = [
  { key: 'pilot', label: 'Pilot', subtitle: 'Sign in to your pilot account' },
  { key: 'mechanic', label: 'Mechanic', subtitle: 'Sign in to your mechanic account' },
  { key: 'admin', label: 'Admin', subtitle: 'Sign in to your admin account' },
]

export default function LoginScreen() {
  const { login, devLogin } = useAuth()
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [role, setRole] = useState<LoginRole>('pilot')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})

  function validate(): boolean {
    const e: typeof errors = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email'
    if (!password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleLogin() {
    if (!validate()) return
    setIsLoading(true)
    setErrors({})
    try {
      await login(email.trim(), password, role)
      // Guard in _layout.tsx handles navigation when isAuthenticated becomes true
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Try again.'
      setErrors({ general: msg })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleBiometric() {
    const supported = await LocalAuthentication.hasHardwareAsync()
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    if (!supported || !enrolled) {
      setErrors({ general: 'Biometric authentication is not available on this device.' })
      return
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to Preheat',
      fallbackLabel: 'Use password',
    })

    if (result.success) {
      // Biometric success — in a real app, retrieve stored credentials or a biometric-bound token
      setErrors({ general: 'Biometric sign-in coming soon. Please use email/password for now.' })
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <IconGlyph icon={Flame} tone="blue" size={64} />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>{ROLE_OPTIONS.find((r) => r.key === role)?.subtitle}</Text>
        </View>

        {/* Role choice */}
        <View style={styles.pillRow}>
          {ROLE_OPTIONS.map((r) => (
            <Chip
              key={r.key}
              label={r.label}
              active={role === r.key}
              onPress={() => setRole(r.key)}
            />
          ))}
        </View>

        {/* General error */}
        {errors.general ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        ) : null}

        {/* Credentials */}
        <Card style={styles.formCard}>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="pilot@airbase.org"
              placeholderTextColor={colors.t3}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.t3}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleLogin()
              }}
            />
            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
          </View>
        </Card>

        {/* Forgot password */}
        <TouchableOpacity style={styles.forgotRow}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Sign In */}
        <Button
          title="Sign In"
          onPress={() => {
            void handleLogin()
          }}
          loading={isLoading}
        />

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Create account */}
        <Link href="/(auth)/register" asChild>
          <Button title="Create Account" variant="secondary" />
        </Link>

        {/* Biometric */}
        <TouchableOpacity
          style={styles.biometricWrap}
          onPress={() => {
            void handleBiometric()
          }}
        >
          <Fingerprint size={32} color={colors.t3} />
          <Text style={styles.biometricLabel}>Use biometric login</Text>
        </TouchableOpacity>

        {/* DEV SHORTCUTS — only in development builds */}
        {__DEV__ && (
          <View style={styles.devPanel}>
            <View style={styles.devHeader}>
              <Zap size={12} color={colors.t3} />
              <Text style={styles.devTitle}>Dev shortcuts</Text>
            </View>
            <View style={styles.devRow}>
              <TouchableOpacity
                style={[styles.devBtn, { backgroundColor: colors.blueD }]}
                onPress={() => void devLogin('pilot')}
                activeOpacity={0.75}
              >
                <Plane size={14} color={colors.blue} />
                <Text style={[styles.devBtnText, { color: colors.blue }]}>Pilot</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devBtn, { backgroundColor: colors.orangeD }]}
                onPress={() => void devLogin('mechanic')}
                activeOpacity={0.75}
              >
                <Wrench size={14} color={colors.orange} />
                <Text style={[styles.devBtnText, { color: colors.orange }]}>Mechanic</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devBtn, { backgroundColor: colors.greenD }]}
                onPress={() => void devLogin('admin')}
                activeOpacity={0.75}
              >
                <ShieldCheck size={14} color={colors.green} />
                <Text style={[styles.devBtnText, { color: colors.green }]}>Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 60 },

    logoWrap: { alignItems: 'center', marginBottom: 16, gap: 14 },
    title: { fontSize: font.xxl, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: font.sm, color: colors.t2 },

    pillRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 24,
    },

    errorBanner: {
      backgroundColor: colors.redD,
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
    },
    errorBannerText: { color: colors.red, fontSize: font.sm, fontWeight: '600' },

    formCard: { marginBottom: 12 },
    fieldWrap: { padding: 14 },
    fieldDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.t2,
      marginBottom: 6,
    },
    input: {
      color: colors.text,
      fontSize: font.md,
      padding: 0,
    },
    fieldError: { fontSize: 12, color: colors.red, marginTop: 6 },

    forgotRow: { alignItems: 'flex-end', marginBottom: 20 },
    forgotText: { fontSize: font.sm, color: colors.blue, fontWeight: '600' },

    dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    dividerText: { fontSize: 12, color: colors.t3, marginHorizontal: 12 },

    biometricWrap: { alignItems: 'center', marginTop: 28, gap: 6 },
    biometricLabel: { fontSize: 11, color: colors.t3 },

    devPanel: {
      marginTop: 36,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 20,
    },
    devHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginBottom: 12,
    },
    devTitle: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.t3,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    devRow: { flexDirection: 'row', gap: 10 },
    devBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 13,
      borderRadius: 14,
    },
    devBtnText: { fontSize: font.sm, fontWeight: '700' },
  })
