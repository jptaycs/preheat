import * as Sentry from '@sentry/react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '../src/context/AuthContext'
import { BadgeProvider } from '../src/context/BadgeContext'
import { usePushNotifications } from '../src/hooks/usePushNotifications'
import { useNetworkStatus } from '../src/hooks/useNetworkStatus'
import { OfflineBanner } from '../src/components/OfflineBanner'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const SENTRY_DSN: string | undefined = process.env.EXPO_PUBLIC_SENTRY_DSN
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  })
}

function Guard() {
  const { isAuthenticated, isLoading } = useAuth()
  usePushNotifications()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(app)')
    }
  }, [isAuthenticated, isLoading, segments])

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0A0F1E',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    )
  }

  return <Slot />
}

function AppShell() {
  const { isOnline } = useNetworkStatus()
  return (
    <View style={{ flex: 1 }}>
      <Guard />
      <OfflineBanner visible={!isOnline} />
    </View>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <BadgeProvider>
        <StatusBar style="light" />
        <AppShell />
      </BadgeProvider>
    </AuthProvider>
  )
}
