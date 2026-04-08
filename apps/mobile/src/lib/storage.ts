import * as SecureStore from 'expo-secure-store'

const KEYS = {
  accessToken: 'preheat_access_token',
  refreshToken: 'preheat_refresh_token',
} as const

export const storage = {
  async getAccessToken() {
    return SecureStore.getItemAsync(KEYS.accessToken)
  },
  async getRefreshToken() {
    return SecureStore.getItemAsync(KEYS.refreshToken)
  },

  async setTokens(access: string, refresh: string) {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.accessToken, access),
      SecureStore.setItemAsync(KEYS.refreshToken, refresh),
    ])
  },

  async clearTokens() {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.accessToken),
      SecureStore.deleteItemAsync(KEYS.refreshToken),
    ])
  },
}
