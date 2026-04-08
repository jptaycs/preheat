import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAuth } from '../../src/context/AuthContext'
import { colors, font, radius } from '../../src/theme'

export default function DashboardScreen() {
  const { user, logout } = useAuth()

  return (
    <View style={styles.root}>
      <Text style={styles.greeting}>Good morning ☀️</Text>
      <Text style={styles.name}>{user?.name ?? 'Pilot'}</Text>
      <Text style={styles.note}>Dashboard coming in Session 006+</Text>

      <TouchableOpacity
        style={styles.signOut}
        onPress={() => {
          void logout()
        }}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  greeting: { fontSize: font.base, color: colors.t2, marginBottom: 4 },
  name: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12 },
  note: { fontSize: font.sm, color: colors.t3, marginBottom: 40 },
  signOut: {
    borderWidth: 1.5,
    borderColor: colors.redD,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  signOutText: { color: colors.red, fontWeight: '600', fontSize: font.base },
})
