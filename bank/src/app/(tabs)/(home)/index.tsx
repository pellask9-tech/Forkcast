import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BalanceCard } from '@/components/BalanceCard';
import { ProgressRing } from '@/components/Charts';
import { Icon, type IconName } from '@/components/Icon';
import { Amount } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { TxnRow } from '@/components/TxnRow';
import { Group, ICON_INSET, IconWell, Row, SectionHeader, T, tap } from '@/components/ui';
import { MAX_GOALS, SAVINGS_RATE } from '@/config';
import { masked } from '@/lib/catalog';
import { monthKey } from '@/lib/dates';
import { accountTxns, balanceOf, firstName, monthTotals, totalBalance, type Books, type Goal } from '@/lib/ledger';
import { useNow } from '@/lib/clock';
import { money } from '@/lib/money';
import { setPrefs, useBank } from '@/lib/store';
import { R, S, usePalette } from '@/theme';

export default function Home() {
  const router = useRouter();
  const { books, prefs } = useBank();
  const now = useNow();
  if (!books) return null;
  const hidden = prefs.hideBalances;
  const totals = monthTotals(books, monthKey(now));
  const recent = accountTxns(books).slice(0, 6);

  return (
    <>
      <Stack.Screen options={{
        title: `Hi, ${firstName(books)}`,
        headerRight: () => (
          <Pressable accessibilityRole="button" accessibilityLabel="Profile and settings" onPress={() => router.push('/profile')} hitSlop={8}>
            <Avatar name={books.owner.name} size={34} />
          </Pressable>
        ),
      }} />
      <Screen tab>
        <BalanceCard total={totalBalance(books)} moneyIn={totals.in} moneyOut={totals.out} hidden={hidden}
          onToggleHidden={() => setPrefs({ hideBalances: !hidden })} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Action icon="send" label="Send" onPress={() => router.push('/send')} />
          <Action icon="bills" label="Pay bills" onPress={() => router.push('/bill')} />
          <Action icon="add" label="Add money" onPress={() => router.push('/add-money')} />
          <Action icon="move" label="Move" onPress={() => router.push('/move')} />
        </View>

        <View>
          <SectionHeader title="Accounts" />
          <Group inset={ICON_INSET}>
            {books.accounts.map(a => (
              <Row key={a.id} title={a.name} chevron
                sub={a.kind === 'savings' ? `${masked(a.number)} · ${SAVINGS_RATE}%` : masked(a.number)}
                leading={<IconWell icon={a.kind === 'savings' ? 'savings' : 'wallet'} />}
                trailing={<Amount value={balanceOf(books, a.id)} hidden={hidden} signed={false} v="body" style={{ fontWeight: '600' }} />}
                onPress={() => router.push({ pathname: '/account/[id]', params: { id: a.id } })} />
            ))}
          </Group>
        </View>

        <View>
          <SectionHeader title="Savings goals" action={books.goals.length < MAX_GOALS ? 'New goal' : undefined} onAction={() => router.push('/goal-edit')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md }} style={{ marginHorizontal: -S.lg }}>
            <View style={{ width: S.lg - S.md }} />
            {books.goals.map(g => <GoalCard key={g.id} goal={g} books={books} hidden={hidden} onPress={() => router.push({ pathname: '/goal/[id]', params: { id: g.id } })} />)}
            {books.goals.length < MAX_GOALS ? <NewGoalCard onPress={() => router.push('/goal-edit')} /> : null}
            <View style={{ width: S.lg - S.md }} />
          </ScrollView>
        </View>

        <View>
          <SectionHeader title="Recent activity" action="See all" onAction={() => router.push('/activity')} />
          <Group inset={ICON_INSET}>
            {recent.map(t => <TxnRow key={t.id} t={t} now={now} onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })} />)}
          </Group>
        </View>
      </Screen>
    </>
  );
}

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const pal = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { tap(); onPress(); }} style={{ alignItems: 'center', gap: S.sm, width: 76 }}>
      {({ pressed }) => (
        <>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: pressed ? pal.sunken : pal.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={24} color={pal.ink} />
          </View>
          <T v="small" style={{ fontWeight: '600', textAlign: 'center' }}>{label}</T>
        </>
      )}
    </Pressable>
  );
}

function GoalCard({ goal, books, hidden, onPress }: { goal: Goal; books: Books; hidden: boolean; onPress: () => void }) {
  const pal = usePalette();
  const saved = balanceOf(books, goal.id);
  const color = pal.data[goal.slot] ?? pal.data[0];
  const pct = Math.round((saved / goal.target) * 100);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${goal.name}, ${hidden ? '' : `${money(saved)} of ${money(goal.target)}, `}${pct}%`} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({ width: 164, backgroundColor: pressed ? pal.sunken : pal.surface, borderRadius: R.md, borderCurve: 'continuous', padding: S.lg, gap: S.md })}>
      <ProgressRing progress={saved / goal.target} size={48} stroke={5} color={color}>
        <Icon name={goal.icon} size={20} color={pal.ink} />
      </ProgressRing>
      <View style={{ gap: 2 }}>
        <T v="label" numberOfLines={1}>{goal.name}</T>
        <T v="small" color={pal.muted} numberOfLines={1}>{hidden ? `${pct}% saved` : `${money(saved, { whole: true })} of ${money(goal.target, { whole: true })}`}</T>
      </View>
    </Pressable>
  );
}

function NewGoalCard({ onPress }: { onPress: () => void }) {
  const pal = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="New savings goal" onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({ width: 120, borderRadius: R.md, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', borderColor: pal.line, backgroundColor: pressed ? pal.sunken : 'transparent', alignItems: 'center', justifyContent: 'center', gap: S.sm, padding: S.lg })}>
      <Icon name="add" size={24} color={pal.muted} />
      <T v="small" color={pal.muted} style={{ fontWeight: '600' }}>New goal</T>
    </Pressable>
  );
}
