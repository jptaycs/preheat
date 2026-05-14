import { Tabs } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { colors } from '../../src/theme'
import { Home, ListOrdered, Bell, User } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useBadge } from '../../src/context/BadgeContext'

function TabIcon({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Icon size={22} color={focused ? colors.blue : colors.t2} strokeWidth={focused ? 2.2 : 1.5} />
      {focused && <View style={styles.dot} />}
    </View>
  )
}

const hiddenTab = { tabBarButton: () => null, tabBarItemStyle: { display: 'none' as const } }

export default function AppLayout() {
  const { alertBadge, confirmBadge } = useBadge()

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
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} />,
          tabBarBadge: confirmBadge > 0 ? confirmBadge : undefined,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Queue',
          tabBarIcon: ({ focused }) => <TabIcon Icon={ListOrdered} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Bell} focused={focused} />,
          tabBarBadge: alertBadge > 0 ? alertBadge : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon Icon={User} focused={focused} />,
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
