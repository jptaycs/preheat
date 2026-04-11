// Expo Push Notification service
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default'
  badge?: number
}

export async function sendPushNotification(messages: PushMessage[]) {
  if (messages.length === 0) return

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    })
    if (!res.ok) {
      console.warn('[push] Expo push API returned', res.status)
    }
  } catch (err) {
    console.warn('[push] Failed to send push notifications:', err)
  }
}
