import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../src/theme'

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, !focused && styles.iconInactive]}>{emoji}</Text>
      {focused && <View style={styles.dot} />}
    </View>
  )
}

const hiddenTab = { tabBarButton: () => null, tabBarItemStyle: { display: 'none' as const } }

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.s1,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingTop: 10,
          paddingBottom: 22,
        },
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.t2,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Queue',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
      <Tabs.Screen name="confirm" options={{ title: 'Confirm', ...hiddenTab }} />
      <Tabs.Screen name="track" options={{ title: 'Track', ...hiddenTab }} />
      <Tabs.Screen name="request" options={{ title: 'Request', ...hiddenTab }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  icon: {
    fontSize: 22,
  },
  iconInactive: {
    opacity: 0.4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.blue,
  },
})
