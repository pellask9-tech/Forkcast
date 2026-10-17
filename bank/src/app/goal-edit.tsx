import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/Charts';
import { FlowHeader } from '@/components/Flow';
import { Icon } from '@/components/Icon';
import { Btn, Field, Notice, T, tap } from '@/components/ui';
import { balanceOf, GOAL_ICONS, type GoalIcon } from '@/lib/ledger';
import { money, parseAmount } from '@/lib/money';
import { createGoal, updateGoal, useBank } from '@/lib/store';
import { GOAL_SLOTS, R, S, usePalette } from '@/theme';

const SLOT_NAMES = ['Blue', 'Orange', 'Aqua', 'Yellow', 'Pink', 'Green', 'Violet', 'Red'];
const ICON_NAMES: Record<GoalIcon, string> = {
  plane: 'Travel', house: 'Home', car: 'Car', laptop: 'Gadget', gift: 'Gift', school: 'Education',
  heart: 'Something special', umbrella: 'Emergency fund', paw: 'Pet', star: 'Other',
};

/** Create a savings goal, or edit one (?id=). */
export default function GoalEdit() {
  const router = useRouter();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { books } = useBank();
  const existing = books?.goals.find(g => g.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing ? String(existing.target / 100) : '');
  const [icon, setIcon] = useState<GoalIcon>(existing?.icon ?? 'plane');
  const [slot, setSlot] = useState<number>(existing?.slot ?? GOAL_SLOTS[(books?.goals.length ?? 0) % GOAL_SLOTS.length]);
  const [error, setError] = useState<string | null>(null);
  if (!books) return null;

  const cents = parseAmount(target) ?? 0;
  const color = pal.data[slot];
  const save = () => {
    const input = { name, icon, slot, target: cents };
    const r = existing ? updateGoal(existing.id, input) : createGoal(input);
    if (!r.ok) return setError(r.error);
    if (existing) router.back();
    else router.replace({ pathname: '/goal/[id]', params: { id: r.value.id } });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pal.paper }} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl + (process.env.EXPO_OS === 'ios' ? 0 : insets.bottom), gap: S.xl, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <FlowHeader title={existing ? 'Edit goal' : 'New goal'} cancel={() => router.back()} />

      <View style={{ alignItems: 'center', gap: S.sm }}>
        <ProgressRing progress={existing && cents ? balanceOf(books, existing.id) / cents : 0.35} size={88} stroke={8} color={color}>
          <Icon name={icon} size={32} color={pal.ink} />
        </ProgressRing>
        <T v="h3">{name.trim() || 'Your goal'}</T>
        <T v="sub" color={pal.muted}>{cents ? `Target ${money(cents, { whole: true })}` : 'Set a target below'}</T>
      </View>

      <Field label="Name" value={name} onChangeText={t => { setName(t); setError(null); }} placeholder="Japan trip, new phone, emergency fund…" maxLength={30} />
      <Field label="Target amount" value={target} onChangeText={t => { setTarget(t.replace(/[^\d.,]/g, '')); setError(null); }} placeholder="50,000" keyboardType="decimal-pad"
        hint="You can change it any time." />

      <View style={{ gap: S.sm }}>
        <T v="label">Icon</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }} accessibilityRole="radiogroup">
          {GOAL_ICONS.map(i => (
            <Pressable key={i} accessibilityRole="radio" accessibilityLabel={ICON_NAMES[i]} accessibilityState={{ selected: icon === i }} onPress={() => { tap(); setIcon(i); }}
              style={{ width: 48, height: 48, borderRadius: R.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: icon === i ? pal.ink : pal.surface }}>
              <Icon name={i} size={22} color={icon === i ? pal.paper : pal.ink} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: S.sm }}>
        <T v="label">Colour</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }} accessibilityRole="radiogroup">
          {GOAL_SLOTS.map(s => (
            <Pressable key={s} accessibilityRole="radio" accessibilityLabel={SLOT_NAMES[s]} accessibilityState={{ selected: slot === s }} onPress={() => { tap(); setSlot(s); }}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: pal.data[s], alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: slot === s ? pal.ink : 'transparent' }}>
              {slot === s ? <Icon name="check" size={18} color="#FFFFFF" /> : null}
            </Pressable>
          ))}
        </View>
      </View>

      {error ? <Notice tone="danger" text={error} /> : null}
      <Btn title={existing ? 'Save changes' : 'Create goal'} onPress={save} />
    </ScrollView>
  );
}
