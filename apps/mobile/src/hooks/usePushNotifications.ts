import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
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

function getProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  const id = extra?.eas?.projectId
  if (!id || id === 'REPLACE_WITH_EAS_PROJECT_ID') return undefined
  return id
}

export function usePushNotifications() {
  useEffect(() => {
    void (async () => {
      if (Platform.OS === 'web') return

      const projectId = getProjectId()
      if (!projectId) {
        console.warn(
          '[push] Missing EAS projectId in app.json (extra.eas.projectId). Run `eas init` and paste the id.',
        )
        return
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== Notifications.PermissionStatus.GRANTED) return

      try {
        const token = await Notifications.getExpoPushTokenAsync({ projectId })
        await authApi.savePushToken(token.data)
      } catch (err) {
        console.warn('[push] Failed to register push token:', err)
      }
    })()
  }, [])
}
