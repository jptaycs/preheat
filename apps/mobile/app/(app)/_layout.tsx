import { Tabs } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { BlurView } from 'expo-blur'
import { useTheme } from '../../src/context/ThemeContext'
import { Home, ListOrdered, Bell, User } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useBadge } from '../../src/context/BadgeContext'

function TabIcon({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: colors.blueD }]}>
      <Icon
        size={21}
        color={focused ? colors.blue : colors.t2}
        strokeWidth={focused ? 2.2 : 1.75}
      />
    </View>
  )
}

const hiddenTab = { tabBarButton: () => null, tabBarItemStyle: { display: 'none' as const } }

export default function AppLayout() {
  const { alertBadge, confirmBadge } = useBadge()
  const { colors, isLight } = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 80,
          paddingTop: 10,
          paddingBottom: 22,
        },
        tabBarBackground: () => (
          <BlurView
            tint={isLight ? 'light' : 'dark'}
            intensity={80}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.t2,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', marginTop: 4 },
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
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
