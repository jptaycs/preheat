import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { authApi } from '../lib/api'

Notifications.setNotificationHandler({
  // eslint-disable-next-line @typescript-eslint/require-await
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function usePushNotifications() {
  useEffect(() => {
    void (async () => {
      if (Platform.OS === 'web') return

      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== Notifications.PermissionStatus.GRANTED) return

      try {
        const token = await Notifications.getExpoPushTokenAsync()
        await authApi.savePushToken(token.data)
      } catch {
        // Push token registration is best-effort — don't crash the app
      }
    })()
  }, [])
}
