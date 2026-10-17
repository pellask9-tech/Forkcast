import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { budgetState, InOutBars, Meter, ShareBar, SpendLine } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { BigAmount } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { Btn, Group, ICON_INSET, IconBtn, IconWell, Notice, Row, SectionHeader, T, tap } from '@/components/ui';
import { category, type CategoryId } from '@/lib/catalog';
import { useNow } from '@/lib/clock';
import { addMonths, dateOf, daysInMonth, monthKey, monthLabel } from '@/lib/dates';
import { cumulativeSpend, firstMonth, inMonth, isSpend, monthTotals, spendByCategory, type Books } from '@/lib/ledger';
import { money, type Cents } from '@/lib/money';
import { useBank } from '@/lib/store';
import { R, S, usePalette } from '@/theme';

export default function Insights() {
  const router = useRouter();
  const pal = usePalette();
  const { books } = useBank();
  const now = useNow();
  const current = monthKey(now);
  const [month, setMonth] = useState(current);
  if (!books) return null;

  const first = firstMonth(books);
  const isCurrent = month === current;
  const prevMonth = addMonths(month, -1);
  const hasPrev = prevMonth >= first;
  const day = isCurrent ? dateOf(now) : daysInMonth(month);
  const running = cumulativeSpend(books, month, day);
  const previous = hasPrev ? cumulativeSpend(books, prevMonth) : [];
  const spent = running[running.length - 1] ?? 0;
  // Compare like with like: so far this month against last month by the same day.
  const before = previous[Math.min(day, previous.length) - 1] ?? 0;
  const delta = spent - before;
  const cats = spendByCategory(books, month);
  const budgeted = (Object.keys(books.budgets) as CategoryId[]).filter(id => !cats.some(c => c.id === id)).map(id => ({ id, amount: 0 }));
  const months = Array.from({ length: 6 }, (_, i) => addMonths(current, i - 5)).filter(m => m >= first)
    .map(m => ({ key: m, label: monthLabel(m, true), ...monthTotals(books, m) }));
  const merchants = topMerchants(books, month);
  const monthName = monthLabel(month).split(' ')[0];
  const prevName = monthLabel(prevMonth).split(' ')[0];

  return (
    <Screen tab>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {month > first ? <IconBtn icon="left" label="Previous month" onPress={() => setMonth(addMonths(month, -1))} /> : <View style={{ width: 40 }} />}
        <T v="h3" accessibilityLiveRegion="polite">{monthLabel(month)}</T>
        {isCurrent ? <View style={{ width: 40 }} /> : <IconBtn icon="right" label="Next month" onPress={() => setMonth(addMonths(month, 1))} />}
      </View>
      {month < first ? null : (
        <View style={{ gap: S.sm }}>
          <T v="sub" color={pal.muted}>{isCurrent ? `Spent so far in ${monthName}` : `Spent in ${monthName}`}</T>
          <BigAmount value={spent} size={40} />
          {hasPrev ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={delta <= 0 ? 'trendDown' : 'trendUp'} size={16} color={delta <= 0 ? pal.positive : pal.danger} />
              <T v="sub" color={delta <= 0 ? pal.positive : pal.danger}>
                {delta === 0 ? 'The same as' : `${money(Math.abs(delta), { whole: true })} ${delta < 0 ? 'less' : 'more'} than`} {isCurrent ? `this time in ${prevName}` : prevName}
              </T>
            </View>
          ) : null}
        </View>
      )}

      {month < first || (!spent && !cats.length) ? (
        <Notice text={`No spending in ${monthLabel(month)}.`} />
      ) : (
        <View style={{ backgroundColor: pal.surface, borderRadius: R.md, borderCurve: 'continuous', padding: S.lg, gap: S.md }}>
          <T v="h3">Spending through the month</T>
          <SpendLine current={running} previous={previous} days={daysInMonth(month)} label={monthName} previousLabel={hasPrev ? prevName : 'No earlier month'}
            dayName={d => `${d} ${monthName.slice(0, 3)}`} />
        </View>
      )}

      <View>
        <SectionHeader title="By category" action="Budgets" onAction={() => router.push('/budgets')} />
        {cats.length || budgeted.length ? (
          <Group inset={ICON_INSET}>
            {[...cats, ...budgeted].map(c => (
              <CategoryRow key={c.id} id={c.id} amount={c.amount} total={spent} budget={books.budgets[c.id]}
                onPress={() => router.push({ pathname: '/activity', params: { category: c.id, month } })} />
            ))}
          </Group>
        ) : (
          <Notice text="Nothing to show yet." />
        )}
      </View>

      {months.length > 1 ? (
        <View style={{ backgroundColor: pal.surface, borderRadius: R.md, borderCurve: 'continuous', padding: S.lg, gap: S.md }}>
          <View style={{ gap: 2 }}>
            <T v="h3">Money in and out</T>
            <T v="small" color={pal.muted}>Moves between your own accounts and goals aren’t counted.</T>
          </View>
          <InOutBars months={months} selected={month} onSelect={setMonth} />
        </View>
      ) : null}

      {merchants.length ? (
        <View>
          <SectionHeader title={`Where you spent most in ${monthName}`} />
          <Group inset={ICON_INSET}>
            {merchants.map(m => (
              <Row key={m.name} title={m.name} sub={m.count === 1 ? '1 payment' : `${m.count} payments`} leading={<IconWell icon={category(m.category).icon} />}
                trailing={<T v="body" tabular style={{ fontWeight: '600' }}>{money(m.amount)}</T>} />
            ))}
          </Group>
        </View>
      ) : null}

      <Btn title="Set monthly budgets" kind="secondary" icon="limit" onPress={() => router.push('/budgets')} />
    </Screen>
  );
}

/** One category: what you spent, its share, and how its budget is going (with words, not just colour). */
function CategoryRow({ id, amount, total, budget, onPress }: { id: CategoryId; amount: Cents; total: Cents; budget?: Cents; onPress: () => void }) {
  const pal = usePalette();
  const c = category(id);
  const state = budget ? budgetState(amount, budget) : null;
  const share = amount / Math.max(1, total);
  const note = budget
    ? state === 'over' ? `Over budget by ${money(amount - budget, { whole: true })}` : `${money(budget - amount, { whole: true })} left of ${money(budget, { whole: true })}`
    : `${Math.round(share * 100)}% of spending`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${c.label}, ${money(amount)}. ${note}`} accessibilityHint="Shows these payments"
      onPress={() => { tap(); onPress(); }}>
      {({ pressed }) => (
        <View style={{ flexDirection: 'row', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md, backgroundColor: pressed ? pal.sunken : 'transparent' }}>
          <IconWell icon={c.icon} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.md }}>
              <T v="body" numberOfLines={1} style={{ flex: 1 }}>{c.label}</T>
              <T v="body" tabular style={{ fontWeight: '600' }}>{money(amount)}</T>
            </View>
            {budget ? <Meter value={amount} max={budget} height={6} /> : <ShareBar share={share} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {state === 'over' ? <Icon name="warning" size={13} color={pal.danger} /> : null}
              <T v="small" color={state === 'over' ? pal.danger : pal.muted}>{note}</T>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function topMerchants(books: Books, month: string) {
  const by = new Map<string, { name: string; amount: Cents; count: number; category: CategoryId }>();
  for (const t of books.txns) {
    if (!isSpend(t) || !inMonth(t, month)) continue;
    const m = by.get(t.title) ?? { name: t.title, amount: 0, count: 0, category: t.category };
    m.amount -= t.amount;
    m.count += 1;
    by.set(t.title, m);
  }
  return [...by.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
}
