# AeroFluxPro Mobile App Visual Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all emoji icons with Lucide vector icons and refine visual styling to match the AeroFluxPro.html design prototype.

**Architecture:** Pure visual layer changes. All business logic, API calls, WebSocket subscriptions, auth context, and navigation structure remain untouched. We add `lucide-react-native` + `react-native-svg` as dependencies and update each screen file.

**Tech Stack:** React Native, Expo Router, lucide-react-native, react-native-svg

---

### Task 1: Install Dependencies

**Files:**

- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Install lucide-react-native and react-native-svg**

Run from the repo root:

```bash
cd apps/mobile && pnpm add lucide-react-native react-native-svg
```

- [ ] **Step 2: Verify installation**

Run: `cd apps/mobile && pnpm ls lucide-react-native react-native-svg`
Expected: Both packages listed with version numbers.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json ../../pnpm-lock.yaml
git commit -m "deps: add lucide-react-native and react-native-svg"
```

---

### Task 2: Update Tab Bar Icons

**Files:**

- Modify: `apps/mobile/app/(app)/_layout.tsx`

Replace emoji-based `TabIcon` component with Lucide icons. The 4 visible tabs use: `Home`, `ListOrdered`, `Bell`, `User`. Hidden tabs (`confirm`, `track`, `request`) don't need icons.

- [ ] **Step 1: Replace TabIcon with Lucide icons**

Replace the emoji `TabIcon` component and all tab icon references:

```tsx
import { Home, ListOrdered, Bell, User } from 'lucide-react-native'
import { colors } from '../../src/theme'

function TabIcon({
  Icon,
  focused,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>
  focused: boolean
}) {
  return (
    <View style={styles.iconWrap}>
      <Icon size={22} color={focused ? colors.blue : colors.t2} strokeWidth={focused ? 2.2 : 1.5} />
      {focused && <View style={styles.dot} />}
    </View>
  )
}
```

Update each `Tabs.Screen`:

- `index`: `tabBarIcon: ({ focused }) => <TabIcon Icon={Home} focused={focused} />`
- `queue`: `tabBarIcon: ({ focused }) => <TabIcon Icon={ListOrdered} focused={focused} />`
- `alerts`: `tabBarIcon: ({ focused }) => <TabIcon Icon={Bell} focused={focused} />`
- `profile`: `tabBarIcon: ({ focused }) => <TabIcon Icon={User} focused={focused} />`

- [ ] **Step 2: Verify typecheck passes**

Run: `cd apps/mobile && pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/_layout.tsx
git commit -m "ui: replace emoji tab icons with Lucide vector icons"
```

---

### Task 3: Update Login Screen

**Files:**

- Modify: `apps/mobile/app/(auth)/login.tsx`

Replace all emoji usage with Lucide icons:

- Logo icon: `✈️` → `<Flame>` icon (matches HTML design's flame logo)
- Pilot pill: `✈ Pilot` → `<Plane>` icon + "Pilot"
- Role toggle: add `Pilot / Mechanic` segmented control per HTML design
- Biometric icon: `👆` → `<Fingerprint>` icon
- Dev shortcuts: `✈` → `<Plane>`, `🔧` → `<Wrench>`, `⚡` → `<Zap>`

- [ ] **Step 1: Add Lucide imports and replace emojis**

```tsx
import { Flame, Plane, Fingerprint, Wrench, Zap } from 'lucide-react-native'
```

Replace each emoji `<Text>` with the corresponding Lucide component:

- `<Text style={styles.logoIcon}>✈️</Text>` → `<Flame size={28} color="#fff" />`
- `<Text style={styles.pillText}>✈ Pilot</Text>` → add `<Plane size={12} color={colors.blue} />` before "Pilot" text
- `<Text style={styles.biometricIcon}>👆</Text>` → `<Fingerprint size={38} color={colors.t3} />`
- Dev panel: replace `✈` with `<Plane>`, `🔧` with `<Wrench>`, `⚡` with `<Zap>`

- [ ] **Step 2: Verify typecheck passes**

Run: `cd apps/mobile && pnpm typecheck`

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(auth\)/login.tsx
git commit -m "ui(login): replace emojis with Lucide icons"
```

---

### Task 4: Update Register Screen

**Files:**

- Modify: `apps/mobile/app/(auth)/register.tsx`

- [ ] **Step 1: Replace emojis with Lucide icons**

```tsx
import { Flame, ArrowLeft } from 'lucide-react-native'
```

- `<Text style={styles.logoIcon}>✈️</Text>` → `<Flame size={24} color="#fff" />`
- `<Text style={styles.backArrow}>←</Text>` → `<ArrowLeft size={20} color={colors.t2} />`

- [ ] **Step 2: Verify typecheck**

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(auth\)/register.tsx
git commit -m "ui(register): replace emojis with Lucide icons"
```

---

### Task 5: Update Dashboard Screen

**Files:**

- Modify: `apps/mobile/app/(app)/index.tsx`

This screen has the most emoji usage. Replace:

- Greeting icons: `☀️` → `<Sun>`, `🌤️` → `<CloudSun>`, `🌙` → `<Moon>`
- Alert banner: `⏰` → `<AlertTriangle>`, chevron `›` → `<ChevronRight>`
- Flight card labels: `🔥` → `<Flame>`, `✈️` → `<Plane>`, `📍` → `<MapPin>`, `📊` → `<BarChart3>`
- Quick action icons: `🔥` → `<PlusCircle>`, `📋` → `<ListOrdered>`, `📊` → `<Activity>`
- Activity icons: `✅` → `<CheckCircle>`, `🔥` → `<Flame>`, `❌` → `<XCircle>`, `📅` → `<Calendar>`

- [ ] **Step 1: Add imports and replace getGreeting emojis**

```tsx
import {
  Sun,
  CloudSun,
  Moon,
  AlertTriangle,
  ChevronRight,
  Flame,
  Plane,
  MapPin,
  BarChart3,
  PlusCircle,
  ListOrdered,
  Activity,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react-native'
```

Update `getGreeting()` to return icon component instead of emoji string. Update `getActivityIcon()` similarly.

- [ ] **Step 2: Replace all inline emoji Text elements**

Go through each JSX emoji occurrence and replace with the Lucide component, using appropriate `size` and `color` props.

- [ ] **Step 3: Verify typecheck**

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(app\)/index.tsx
git commit -m "ui(dashboard): replace emojis with Lucide icons"
```

---

### Task 6: Update Request Preheat Screen

**Files:**

- Modify: `apps/mobile/app/(app)/request.tsx`

Replace:

- Dropdown arrow: `▾` → `<ChevronDown>`
- Modal close: `✕` → `<X>`
- Selected check: `✓` → `<Check>`
- Success icon: `✅` → `<CheckCircle>`

- [ ] **Step 1: Add imports and replace emojis**

```tsx
import { ChevronDown, X, Check, CheckCircle } from 'lucide-react-native'
```

- [ ] **Step 2: Verify typecheck**

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/request.tsx
git commit -m "ui(request): replace emojis with Lucide icons"
```

---

### Task 7: Update Queue Screen

**Files:**

- Modify: `apps/mobile/app/(app)/queue.tsx`

Replace:

- Time labels: `🔥` → `<Flame>`, `✈` → `<Plane>`
- Mine indicator: `✈ My Aircraft` → `<Plane>` + "My Aircraft"

- [ ] **Step 1: Add imports and replace emojis**

```tsx
import { Flame, Plane, Clock } from 'lucide-react-native'
```

- [ ] **Step 2: Verify typecheck**

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/queue.tsx
git commit -m "ui(queue): replace emojis with Lucide icons"
```

---

### Task 8: Update Confirm Screen

**Files:**

- Modify: `apps/mobile/app/(app)/confirm.tsx`

Replace:

- Warning icon: `⚠️` → `<AlertTriangle>`
- Summary labels: `🔥` → `<Flame>`, `✈️` → `<Plane>`
- Warning alert: `🚨` → `<AlertTriangle>`
- Confirm button: `✅` → `<CheckCircle>`
- Cancel button: `✗` → `<XCircle>`
- Empty state: `✅` → `<CheckCircle>`
- Confirmed check: `✓` → `<Check>`

- [ ] **Step 1: Add imports and replace emojis**

```tsx
import { AlertTriangle, Flame, Plane, CheckCircle, XCircle, Check } from 'lucide-react-native'
```

- [ ] **Step 2: Verify typecheck**

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/confirm.tsx
git commit -m "ui(confirm): replace emojis with Lucide icons"
```

---

### Task 9: Update Track Screen

**Files:**

- Modify: `apps/mobile/app/(app)/track.tsx`

Replace:

- Back button: `←` → `<ArrowLeft>`
- Refresh: `↻` → `<RefreshCw>`
- Complete icon: `🟢` → `<CheckCircle>`
- Empty state: `✈️` → `<Plane>`, `🔧` → `<Wrench>`, `⏳` → `<Clock>`
- Complete button: `✓` → `<Check>`

- [ ] **Step 1: Add imports and replace emojis**

```tsx
import { ArrowLeft, RefreshCw, CheckCircle, Plane, Wrench, Clock, Check } from 'lucide-react-native'
```

- [ ] **Step 2: Verify typecheck**

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/track.tsx
git commit -m "ui(track): replace emojis with Lucide icons"
```

---

### Task 10: Update Alerts Screen

**Files:**

- Modify: `apps/mobile/app/(app)/alerts.tsx`

Replace the `ALERT_STYLE` emoji map with Lucide icon components:

- `confirm_reminder`: `⏰` → `<BellRing>`
- `slot_cancelled`: `❌` → `<XCircle>`
- `session_started`: `🔥` → `<Flame>`
- `session_completed`: `✅` → `<CheckCircle>`
- `info`: `📋` → `<Info>`
- Urgent label: `🚨` → `<Zap>`
- Empty state: `🔔` → `<Bell>`

- [ ] **Step 1: Add imports and replace emojis**

```tsx
import { BellRing, XCircle, Flame, CheckCircle, Info, Zap, Bell } from 'lucide-react-native'
```

Update `ALERT_STYLE` to store icon components instead of emoji strings. Update `renderAlertItem` to render the icon component.

- [ ] **Step 2: Verify typecheck**

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/alerts.tsx
git commit -m "ui(alerts): replace emojis with Lucide icons"
```

---

### Task 11: Update Profile Screen

**Files:**

- Modify: `apps/mobile/app/(app)/profile.tsx`

Replace:

- Role labels: `✈ Pilot Role` → `<Plane>` + "Pilot", `🔧 Mechanic Role` → `<Wrench>` + "Mechanic", `⚙ Admin Role` → `<Settings>` + "Admin"
- Aircraft icon: `✈️` → `<Plane>`

- [ ] **Step 1: Add imports and replace emojis**

```tsx
import { Plane, Wrench, Settings, LogOut } from 'lucide-react-native'
```

- [ ] **Step 2: Verify typecheck**

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(app\)/profile.tsx
git commit -m "ui(profile): replace emojis with Lucide icons"
```

---

### Task 12: Final Typecheck and Verification

- [ ] **Step 1: Run full typecheck**

```bash
cd apps/mobile && pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 2: Search for remaining emojis**

```bash
grep -rn '[\x{1F300}-\x{1F9FF}]' apps/mobile/app/ apps/mobile/src/ || echo "No emojis found"
```

Expected: No emoji matches in app code (only in static data/strings if intentional).

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A apps/mobile/
git commit -m "ui: complete AeroFluxPro visual redesign — all emojis replaced with Lucide icons"
```
