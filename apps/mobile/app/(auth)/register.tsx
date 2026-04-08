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
import { useAuth, ApiError } from '../../src/context/AuthContext'
import { colors, radius, font } from '../../src/theme'

interface Fields {
  name: string
  email: string
  password: string
  confirmPass: string
  licenseNumber: string
}

interface FieldErrors extends Partial<Record<keyof Fields, string>> {
  general?: string
}

export default function RegisterScreen() {
  const { register } = useAuth()
  const router = useRouter()

  const [fields, setFields] = useState<Fields>({
    name: '',
    email: '',
    password: '',
    confirmPass: '',
    licenseNumber: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  function set(key: keyof Fields) {
    return (value: string) => setFields((f) => ({ ...f, [key]: value }))
  }

  function validate(): boolean {
    const e: FieldErrors = {}
    if (!fields.name.trim()) e.name = 'Full name is required'
    if (!fields.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(fields.email)) e.email = 'Enter a valid email'
    if (!fields.password) e.password = 'Password is required'
    else if (fields.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (fields.password !== fields.confirmPass) e.confirmPass = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleRegister() {
    if (!validate()) return
    setIsLoading(true)
    setErrors({})
    try {
      await register({
        name: fields.name.trim(),
        email: fields.email.trim(),
        password: fields.password,
        licenseNumber: fields.licenseNumber.trim() || undefined,
      })
      router.replace('/(app)')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Try again.'
      setErrors({ general: msg })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.backRow}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backLabel}>Sign In</Text>
          </TouchableOpacity>
        </Link>

        <View style={styles.headerWrap}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>✈️</Text>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the Preheat pilot network</Text>
        </View>

        {/* General error */}
        {errors.general ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        ) : null}

        {/* Name */}
        <Field label="FULL NAME" error={errors.name}>
          <TextInput
            style={[styles.input, errors.name ? styles.inputError : null]}
            placeholder="Capt. Marcus Reid"
            placeholderTextColor={colors.t3}
            value={fields.name}
            onChangeText={set('name')}
            autoComplete="name"
            returnKeyType="next"
          />
        </Field>

        {/* Email */}
        <Field label="EMAIL ADDRESS" error={errors.email}>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="pilot@airbase.org"
            placeholderTextColor={colors.t3}
            value={fields.email}
            onChangeText={set('email')}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
          />
        </Field>

        {/* Password */}
        <Field label="PASSWORD" error={errors.password}>
          <View
            style={[styles.input, styles.passwordRow, errors.password ? styles.inputError : null]}
          >
            <TextInput
              style={styles.passwordInput}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.t3}
              value={fields.password}
              onChangeText={set('password')}
              secureTextEntry={!showPass}
              returnKeyType="next"
            />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
              <Text style={styles.showHide}>{showPass ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </Field>

        {/* Confirm password */}
        <Field label="CONFIRM PASSWORD" error={errors.confirmPass}>
          <TextInput
            style={[styles.input, errors.confirmPass ? styles.inputError : null]}
            placeholder="Re-enter password"
            placeholderTextColor={colors.t3}
            value={fields.confirmPass}
            onChangeText={set('confirmPass')}
            secureTextEntry={!showPass}
            returnKeyType="next"
          />
        </Field>

        {/* License number (optional) */}
        <Field label="PILOT LICENSE NUMBER (OPTIONAL)" error={errors.licenseNumber}>
          <TextInput
            style={styles.input}
            placeholder="PPL-US-442819"
            placeholderTextColor={colors.t3}
            value={fields.licenseNumber}
            onChangeText={set('licenseNumber')}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={() => {
              void handleRegister()
            }}
          />
        </Field>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
          onPress={() => {
            void handleRegister()
          }}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          By creating an account you agree to our{' '}
          <Text style={{ color: colors.blue }}>Terms of Service</Text> and{' '}
          <Text style={{ color: colors.blue }}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backArrow: { fontSize: font.xl, color: colors.t2 },
  backLabel: { fontSize: font.base, color: colors.t2, fontWeight: '600' },

  headerWrap: { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#1E3D7A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.blue,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logoIcon: { fontSize: 24 },
  title: { fontSize: font.xxl, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: font.sm, color: colors.t2 },

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

  btnPrimary: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.blue,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontSize: font.md, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  terms: { fontSize: 11, color: colors.t3, textAlign: 'center', marginTop: 16, lineHeight: 18 },
})
