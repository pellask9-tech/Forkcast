import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader } from '@/components/Flow';
import { IconWell, ICON_INSET, T } from '@/components/ui';
import { CURRENCY } from '@/config';
import { SPEND_CATEGORIES, type CategoryId } from '@/lib/catalog';
import { useNow } from '@/lib/clock';
import { monthKey } from '@/lib/dates';
import { spendByCategory } from '@/lib/ledger';
import { money, parseAmount } from '@/lib/money';
import { setBudget, useBank } from '@/lib/store';
import { R, S, usePalette } from '@/theme';

/** A monthly limit per category. Leave one empty for no limit. Changes save as you go. */
export default function Budgets() {
  const router = useRouter();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const { books } = useBank();
  const [drafts, setDrafts] = useState<Partial<Record<CategoryId, string>>>({});
  const now = useNow();
  if (!books) return null;
  const spent = new Map(spendByCategory(books, monthKey(now)).map(c => [c.id, c.amount]));
  const commit = (id: CategoryId) => {
    const text = drafts[id];
    if (text === undefined) return;
    const amount = text.trim() ? parseAmount(text) : null;
    // Something that isn't an amount keeps the budget it had.
    if (text.trim() && amount === null) return;
    setBudget(id, amount);
    setDrafts(d => { const next = { ...d }; delete next[id]; return next; });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pal.paper }} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl + (process.env.EXPO_OS === 'ios' ? 0 : insets.bottom), gap: S.lg, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <FlowHeader title="Monthly budgets" done={() => { (Object.keys(drafts) as CategoryId[]).forEach(commit); router.back(); }} />
      <T v="sub" color={pal.muted}>Set a monthly limit for any category. Insights shows how each one is going, and warns you at 80%.</T>
      <View style={{ backgroundColor: pal.surface, borderRadius: R.md, borderCurve: 'continuous', overflow: 'hidden' }}>
        {SPEND_CATEGORIES.map((c, i) => {
          const budget = books.budgets[c.id];
          const value = drafts[c.id] ?? (budget ? String(budget / 100) : '');
          return (
            <View key={c.id}>
              {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: pal.line, marginLeft: ICON_INSET }} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md }}>
                <IconWell icon={c.icon} />
                <View style={{ flex: 1 }}>
                  <T v="body">{c.label}</T>
                  <T v="small" color={pal.muted}>{money(spent.get(c.id) ?? 0, { whole: true })} this month</T>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: pal.sunken, borderRadius: R.sm, paddingHorizontal: S.md }}>
                  <T v="sub" color={pal.muted}>{CURRENCY.symbol}</T>
                  <TextInput value={value} onChangeText={t => setDrafts(d => ({ ...d, [c.id]: t.replace(/[^\d.,]/g, '') }))} onBlur={() => commit(c.id)} onSubmitEditing={() => commit(c.id)}
                    placeholder="No limit" placeholderTextColor={pal.faint} keyboardType="decimal-pad" returnKeyType="done" accessibilityLabel={`${c.label} monthly budget`}
                    style={{ width: 92, fontSize: 17, color: pal.ink, paddingVertical: 10, textAlign: 'right', fontVariant: ['tabular-nums'] }} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
