import { NativeTabs } from 'expo-router/native-tabs';

import { ICONS } from './Icon';
import { usePalette } from '@/theme';

/** The system tab bar: Liquid Glass on iOS 26, Material on Android. */
export default function AppTabs() {
  const pal = usePalette();
  const tab = (name: string, label: string, icon: keyof typeof ICONS) => (
    <NativeTabs.Trigger name={name}>
      <NativeTabs.Trigger.Label>{label}</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf={ICONS[icon].ios} md={ICONS[icon].android} />
    </NativeTabs.Trigger>
  );
  return (
    <NativeTabs backgroundColor={pal.paper} indicatorColor={pal.sunken} tintColor={pal.ink} labelStyle={{ selected: { color: pal.ink } }}>
      {tab('(home)', 'Home', 'home')}
      {tab('pay', 'Pay', 'pay')}
      {tab('cards', 'Cards', 'cards')}
      {tab('insights', 'Insights', 'insights')}
    </NativeTabs>
  );
}
