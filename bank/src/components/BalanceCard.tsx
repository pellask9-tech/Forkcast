import { View } from 'react-native';

import { MASK, money, type Cents } from '@/lib/money';
import { R, S, useIsDark, usePalette } from '@/theme';
import { Guilloche } from './Brand';
import { Icon } from './Icon';
import { BigAmount } from './Money';
import { IconBtn, T } from './ui';

/** The total across accounts and goals, on navy with banknote linework, and this month's money in and out. */
export function BalanceCard({ total, moneyIn, moneyOut, hidden, onToggleHidden }: {
  total: Cents; moneyIn: Cents; moneyOut: Cents; hidden: boolean; onToggleHidden: () => void;
}) {
  const pal = usePalette();
  const dark = useIsDark();
  const stat = (icon: 'downLeft' | 'up', label: string, value: string) => (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={13} color={pal.brandMuted} />
        <T v="small" color={pal.brandMuted}>{label}</T>
      </View>
      <T v="label" color={pal.brandInk} tabular>{value}</T>
    </View>
  );
  return (
    <View style={{ borderRadius: R.lg, borderCurve: 'continuous', boxShadow: dark ? undefined : '0 10px 24px rgba(19, 33, 60, 0.20)' }}>
      <View style={{ backgroundColor: pal.brand, borderRadius: R.lg, borderCurve: 'continuous', overflow: 'hidden', padding: S.xl - 4, gap: S.md }}>
        <Guilloche color={pal.gold} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T v="label" color={pal.brandMuted}>Total balance</T>
          <IconBtn icon={hidden ? 'eye' : 'eyeOff'} label={hidden ? 'Show balances' : 'Hide balances'} tone="onBrand" size={36} onPress={onToggleHidden} />
        </View>
        <BigAmount value={total} hidden={hidden} color={pal.brandInk} size={42} />
        <View style={{ flexDirection: 'row', gap: S.lg, marginTop: S.xs }}>
          {stat('downLeft', 'In this month', hidden ? MASK : money(moneyIn, { sign: 'always' }))}
          {stat('up', 'Out this month', hidden ? MASK : money(-moneyOut))}
        </View>
      </View>
    </View>
  );
}
