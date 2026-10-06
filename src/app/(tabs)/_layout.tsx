import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { usePalette } from '@/theme';

export default function TabsLayout() {
  const pal = usePalette();
  return (
    <NativeTabs
      backgroundColor={pal.paper}
      indicatorColor={pal.soft}
      tintColor={pal.ink}
      labelStyle={{ selected: { color: pal.ink } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Label>Meal plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet.clipboard" md="event_note" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="body">
        <NativeTabs.Trigger.Label>Body</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.stand" md="monitor_weight" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
