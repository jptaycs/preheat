import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '../src/context/AuthContext'
import { BadgeProvider } from '../src/context/BadgeContext'
import { usePushNotifications } from '../src/hooks/usePushNotifications'

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

export default function RootLayout() {
  return (
    <AuthProvider>
      <BadgeProvider>
        <StatusBar style="light" />
        <Guard />
      </BadgeProvider>
    </AuthProvider>
  )
}
