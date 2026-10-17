import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { ProgressRing } from '@/components/Charts';
import { HeaderAction } from '@/components/Header';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TxnRow } from '@/components/TxnRow';
import { Btn, Group, ICON_INSET, IconWell, Notice, Row, SectionHeader, T } from '@/components/ui';
import { useNow } from '@/lib/clock';
import { DAY } from '@/lib/dates';
import { balanceOf, everyday } from '@/lib/ledger';
import { MASK, money } from '@/lib/money';
import { closeGoal, useBank } from '@/lib/store';
import { S, usePalette } from '@/theme';

export default function GoalScreen() {
  const router = useRouter();
  const pal = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books, prefs } = useBank();
  const now = useNow();
  const goal = books?.goals.find(g => g.id === id);
  if (!books || !goal) return <Screen><Notice text="This goal has been closed." /></Screen>;

  const saved = balanceOf(books, goal.id);
  const color = pal.data[goal.slot] ?? pal.data[0];
  const progress = saved / goal.target;
  const hidden = prefs.hideBalances;
  const history = books.txns.filter(t => t.holder === goal.id);
  const recent = history.filter(t => t.at > now - 30 * DAY).reduce((s, t) => s + t.amount, 0);
  const home = everyday(books);

  const close = () => Alert.alert(
    `Close “${goal.name}”?`,
    saved > 0 ? `The ${money(saved)} in it goes back to ${home.name}.` : 'It has nothing in it, so nothing moves.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Close goal', style: 'destructive', onPress: () => { const r = closeGoal(goal.id); if (r.ok) router.back(); } }],
  );

  return (
    <>
      <Stack.Screen options={{ title: goal.name, headerRight: () => <HeaderAction kind="edit" label="Edit goal" onPress={() => router.push({ pathname: '/goal-edit', params: { id: goal.id } })} /> }} />
      <Screen>
        <View style={{ alignItems: 'center', gap: S.md, paddingTop: S.md }}>
          <ProgressRing progress={progress} size={168} stroke={12} color={color}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Icon name={goal.icon} size={30} color={pal.ink} />
              <T v="h2" tabular>{Math.min(100, Math.round(progress * 100))}%</T>
            </View>
          </ProgressRing>
          <T v="h3" style={{ textAlign: 'center' }}>{hidden ? MASK : money(saved)} <T v="sub" color={pal.muted}>of {money(goal.target, { whole: true })}</T></T>
          <T v="sub" color={pal.muted}>{saved >= goal.target ? 'You’ve reached this goal.' : hidden ? 'Keep going.' : `${money(goal.target - saved, { whole: true })} to go`}</T>
        </View>

        {saved >= goal.target ? <Notice icon="checkCircle" text="Goal reached. Spend it, keep saving, or raise the target in Edit." /> : null}

        <View style={{ flexDirection: 'row', gap: S.md }}>
          <Btn title="Add money" icon="add" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/move', params: { from: home.id, to: goal.id } })} />
          <Btn title="Withdraw" kind="secondary" style={{ flex: 1 }} disabled={saved <= 0} onPress={() => router.push({ pathname: '/move', params: { from: goal.id, to: home.id } })} />
        </View>

        <Group inset={ICON_INSET}>
          <Row title="Last 30 days" value={hidden ? MASK : money(recent, { sign: 'always' })} leading={<IconWell icon="calendar" />} />
        </Group>

        <View>
          <SectionHeader title="History" />
          {history.length ? (
            <Group inset={ICON_INSET}>
              {history.slice(0, 30).map(t => <TxnRow key={t.id} t={t} now={now} onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })} />)}
            </Group>
          ) : <Notice text="Nothing saved yet. Add money to get started." />}
        </View>

        <Group>
          <Row title="Close goal" sub={saved > 0 ? `Moves ${hidden ? 'its money' : money(saved)} back to ${home.name}` : undefined} destructive onPress={close} />
        </Group>
      </Screen>
    </>
  );
}
