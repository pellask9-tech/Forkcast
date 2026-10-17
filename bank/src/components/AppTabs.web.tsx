import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@/theme';
import { Icon, type IconName } from './Icon';

/** Browsers have no system tab bar, so the web build gets a plain bottom bar with the same four tabs. */
export default function AppTabs() {
  const pal = usePalette();
  return (
    <Tabs style={{ flex: 1, backgroundColor: pal.paper }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={{ flexDirection: 'row', backgroundColor: pal.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line, paddingBottom: 'env(safe-area-inset-bottom)' as any }}>
        <TabTrigger name="(home)" href="/" asChild><TabButton icon="home" label="Home" /></TabTrigger>
        <TabTrigger name="pay" href="/pay" asChild><TabButton icon="pay" label="Pay" /></TabTrigger>
        <TabTrigger name="cards" href="/cards" asChild><TabButton icon="cards" label="Cards" /></TabTrigger>
        <TabTrigger name="insights" href="/insights" asChild><TabButton icon="insights" label="Insights" /></TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({ icon, label, isFocused, ref: _ref, ...props }: TabTriggerSlotProps & { icon: IconName; label: string }) {
  const pal = usePalette();
  const color = isFocused ? pal.ink : pal.muted;
  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityState={{ selected: !!isFocused }} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 3, borderRadius: 999, backgroundColor: isFocused ? pal.sunken : 'transparent' }}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: isFocused ? '700' : '500', color }}>{label}</Text>
    </Pressable>
  );
}
