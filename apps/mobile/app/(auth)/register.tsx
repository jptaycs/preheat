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
import { useRouter, Link } from 'expo-router'
import { useMemo, useState } from 'react'
import { useAuth, ApiError } from '../../src/context/AuthContext'
import { font } from '../../src/theme'
import type { ThemeColors } from '../../src/theme'
import { useTheme } from '../../src/context/ThemeContext'
import { Flame, ArrowLeft } from 'lucide-react-native'
import { Card, Button, IconGlyph } from '../../src/components/ui'

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
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [fields, setFields] = useState<Fields>({
    name: '',
    email: '',
    password: '',
    confirmPass: '',
    licenseNumber: '',
  })
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
            <ArrowLeft size={20} color={colors.t2} />
            <Text style={styles.backLabel}>Sign In</Text>
          </TouchableOpacity>
        </Link>

        <View style={styles.headerWrap}>
          <IconGlyph icon={Flame} tone="blue" size={56} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the Preheat pilot network</Text>
        </View>

        {/* General error */}
        {errors.general ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        ) : null}

        <Card style={styles.formCard} padded={false}>
          <Field label="Full name" error={errors.name}>
            <TextInput
              style={styles.input}
              placeholder="Capt. Marcus Reid"
              placeholderTextColor={colors.t3}
              value={fields.name}
              onChangeText={set('name')}
              autoComplete="name"
              returnKeyType="next"
            />
          </Field>

          <Field label="Email address" error={errors.email}>
            <TextInput
              style={styles.input}
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

          <Field label="Password" error={errors.password}>
            <TextInput
              style={styles.input}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.t3}
              value={fields.password}
              onChangeText={set('password')}
              secureTextEntry
              textContentType="oneTimeCode"
              autoComplete="off"
              returnKeyType="next"
            />
          </Field>

          <Field label="Confirm password" error={errors.confirmPass}>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={colors.t3}
              value={fields.confirmPass}
              onChangeText={set('confirmPass')}
              secureTextEntry
              textContentType="oneTimeCode"
              autoComplete="off"
              returnKeyType="next"
            />
          </Field>

          <Field label="Pilot license number (optional)" error={errors.licenseNumber} last>
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
        </Card>

        {/* Submit */}
        <Button
          title="Create Account"
          onPress={() => {
            void handleRegister()
          }}
          loading={isLoading}
          style={styles.submitBtn}
        />

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
  last,
}: {
  label: string
  error?: string
  children: React.ReactNode
  last?: boolean
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View>
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>{label}</Text>
        {children}
        {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      </View>
      {!last && <View style={styles.fieldDivider} />}
    </View>
  )
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },

    backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
    backLabel: { fontSize: font.base, color: colors.t2, fontWeight: '600' },

    headerWrap: { alignItems: 'center', marginBottom: 28, gap: 12 },
    title: { fontSize: font.xxl, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: font.sm, color: colors.t2 },

    errorBanner: {
      backgroundColor: colors.redD,
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
    },
    errorBannerText: { color: colors.red, fontSize: font.sm, fontWeight: '600' },

    formCard: { marginBottom: 20 },
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

    submitBtn: { marginTop: 4 },

    terms: { fontSize: 11, color: colors.t3, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  })
