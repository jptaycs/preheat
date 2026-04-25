import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useRouter, Link } from 'expo-router'
import { useState } from 'react'
import * as LocalAuthentication from 'expo-local-authentication'
import { useAuth, ApiError } from '../../src/context/AuthContext'
import { colors, radius, font } from '../../src/theme'
import { Flame, Plane, Fingerprint, Wrench, Zap } from 'lucide-react-native'

export default function LoginScreen() {
  const { login, devLogin } = useAuth()
  const router = useRouter()

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
      await login(email.trim(), password)
      router.replace('/(app)')
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
          <View style={styles.logoBox}>
            <Flame size={28} color="#fff" />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your pilot account</Text>
        </View>

        {/* Role pill */}
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Plane size={12} color={colors.blue} />
              <Text style={styles.pillText}>Pilot</Text>
            </View>
          </View>
        </View>

        {/* General error */}
        {errors.general ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        ) : null}

        {/* Email */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
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

        {/* Password */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={[styles.input, errors.password ? styles.inputError : null]}
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

        {/* Forgot password */}
        <TouchableOpacity style={styles.forgotRow}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Sign In */}
        <TouchableOpacity
          style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
          onPress={() => {
            void handleLogin()
          }}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Create account */}
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.btnGhost} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Create Account</Text>
          </TouchableOpacity>
        </Link>

        {/* Biometric */}
        <TouchableOpacity
          style={styles.biometricWrap}
          onPress={() => {
            void handleBiometric()
          }}
        >
          <Fingerprint size={38} color={colors.t3} />
          <Text style={styles.biometricLabel}>Use biometric login</Text>
        </TouchableOpacity>

        {/* DEV SHORTCUTS — only in development builds */}
        {__DEV__ && (
          <View style={styles.devPanel}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                marginBottom: 12,
              }}
            >
              <Zap size={12} color={colors.t3} />
              <Text style={[styles.devTitle, { marginBottom: 0 }]}>DEV SHORTCUTS</Text>
            </View>
            <View style={styles.devRow}>
              <TouchableOpacity
                style={[styles.devBtn, styles.devBtnPilot]}
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                onPress={() => {
                  devLogin('pilot')
                  void router.replace('/(app)')
                }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Plane size={14} color={colors.text} />
                  <Text style={styles.devBtnText}>Pilot</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devBtn, styles.devBtnMechanic]}
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                onPress={() => {
                  devLogin('mechanic')
                  void router.replace('/(app)')
                }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Wrench size={14} color={colors.text} />
                  <Text style={styles.devBtnText}>Mechanic</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 60 },

  logoWrap: { alignItems: 'center', marginBottom: 16 },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#1E3D7A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: colors.blue,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoIcon: { fontSize: 28 },
  title: { fontSize: font.xxl, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: font.sm, color: colors.t2 },

  pillRow: { alignItems: 'center', marginBottom: 24 },
  pill: {
    backgroundColor: colors.blueD,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  pillText: { fontSize: 11, fontWeight: '700', color: colors.blue, letterSpacing: 0.5 },

  errorBanner: {
    backgroundColor: colors.redD,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: colors.red, fontSize: font.sm, fontWeight: '600' },

  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: colors.t2, marginBottom: 6, letterSpacing: 0.8 },
  input: {
    backgroundColor: colors.s2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: colors.text,
    fontSize: font.md,
  },
  inputError: { borderColor: colors.red },
  fieldError: { fontSize: 12, color: colors.red, marginTop: 4 },

  passwordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 },
  passwordInput: { flex: 1, color: colors.text, fontSize: font.md, paddingVertical: 14 },
  showHide: { fontSize: 12, color: colors.blue, fontWeight: '600', paddingLeft: 8 },

  forgotRow: { alignItems: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: font.sm, color: colors.blue, fontWeight: '600' },

  btnPrimary: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.blue,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.t3, marginHorizontal: 12 },

  btnGhost: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnGhostText: { color: colors.t2, fontSize: font.base, fontWeight: '600' },

  biometricWrap: { alignItems: 'center', marginTop: 28 },
  biometricIcon: { fontSize: 38 },
  biometricLabel: { fontSize: 11, color: colors.t3, marginTop: 6 },

  devPanel: {
    marginTop: 36,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
  },
  devTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.t3,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 12,
  },
  devRow: { flexDirection: 'row', gap: 10 },
  devBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  devBtnPilot: { backgroundColor: colors.blueD, borderColor: colors.blue },
  devBtnMechanic: { backgroundColor: colors.orangeD, borderColor: colors.orange },
  devBtnText: { color: colors.text, fontSize: font.sm, fontWeight: '700' },
})
