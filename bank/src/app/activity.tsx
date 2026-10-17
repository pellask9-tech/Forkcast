import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { kindLabel, TxnRow } from '@/components/TxnRow';
import { Chip, ICON_INSET, Notice, SearchField, T } from '@/components/ui';
import { category, type CategoryId } from '@/lib/catalog';
import { dayKey, dayLabel, monthLabel } from '@/lib/dates';
import { accountTxns, inMonth, isSpend, type Txn } from '@/lib/ledger';
import { money } from '@/lib/money';
import { useBank } from '@/lib/store';
import { R, S, usePalette } from '@/theme';

type Filter = 'all' | 'in' | 'out' | 'pending';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'in', label: 'Money in' }, { value: 'out', label: 'Money out' }, { value: 'pending', label: 'Pending' },
];

/** Every entry on your accounts, newest first, grouped by day. Insights opens it scoped to a category and month. */
export default function Activity() {
  const router = useRouter();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string; month?: string; account?: string }>();
  const { books } = useBank();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [account, setAccount] = useState(params.account ?? 'all');
  const [scope, setScope] = useState(params.category ? { category: params.category as CategoryId, month: params.month } : null);
  if (!books) return null;

  const q = query.trim().toLowerCase();
  const matches = (t: Txn) =>
    (account === 'all' || t.holder === account) &&
    (filter === 'all' || (filter === 'in' ? t.amount > 0 : filter === 'out' ? t.amount < 0 : t.status === 'pending')) &&
    (!scope || (isSpend(t) && t.category === scope.category && (!scope.month || inMonth(t, scope.month)))) &&
    (!q || [t.title, t.note ?? '', kindLabel(t), money(Math.abs(t.amount))].some(s => s.toLowerCase().includes(q)));

  const sections: { key: string; title: string; total: number; data: Txn[] }[] = [];
  for (const t of accountTxns(books)) {
    if (!matches(t)) continue;
    const key = dayKey(t.at);
    const last = sections[sections.length - 1];
    if (last?.key === key) last.data.push(t);
    else sections.push({ key, title: dayLabel(key), total: 0, data: [t] });
    if (isSpend(t)) sections[sections.length - 1].total -= t.amount;
  }

  const header = (
    <View style={{ gap: S.md }}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search payments" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.sm }}>
        {FILTERS.map(f => <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />)}
        <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: pal.line, marginHorizontal: S.xs }} />
        {[{ id: 'all', name: 'All accounts' }, ...books.accounts].map(a => (
          <Chip key={a.id} label={a.name} selected={account === a.id} onPress={() => setAccount(a.id)} />
        ))}
      </ScrollView>
      {scope ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Showing ${category(scope.category).label}. Clear`} onPress={() => setScope(null)}
          style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: S.sm, backgroundColor: pal.ink, borderRadius: R.pill, paddingVertical: 8, paddingHorizontal: 14 }}>
          <T v="label" color={pal.paper}>{category(scope.category).label}{scope.month ? ` · ${monthLabel(scope.month)}` : ''}</T>
          <Icon name="close" size={14} color={pal.paper} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: scope ? category(scope.category).label : 'Activity' }} />
      <SectionList
        sections={sections}
        keyExtractor={t => t.id}
        style={{ flex: 1, backgroundColor: pal.paper }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        initialNumToRender={24}
        contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl + (process.env.EXPO_OS === 'ios' ? 0 : insets.bottom), width: '100%', maxWidth: 680, alignSelf: 'center' }}
        ListHeaderComponent={header}
        ListEmptyComponent={<Notice text={q ? `Nothing matches “${query.trim()}”.` : 'Nothing here yet.'} style={{ marginTop: S.xl }} />}
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: S.xl, marginBottom: S.sm, paddingHorizontal: S.xs }} accessibilityRole="header">
            <T v="label" color={pal.muted}>{section.title}</T>
            {section.total ? <T v="small" color={pal.muted} tabular>{money(section.total, { whole: true })} spent</T> : null}
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const last = index === section.data.length - 1;
          return (
            <View style={{
              backgroundColor: pal.surface, overflow: 'hidden', borderCurve: 'continuous',
              borderTopLeftRadius: index === 0 ? R.md : 0, borderTopRightRadius: index === 0 ? R.md : 0,
              borderBottomLeftRadius: last ? R.md : 0, borderBottomRightRadius: last ? R.md : 0,
            }}>
              {index > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: pal.line, marginLeft: ICON_INSET }} /> : null}
              <TxnRow t={item} onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: item.id } })} />
            </View>
          );
        }}
      />
    </>
  );
}
