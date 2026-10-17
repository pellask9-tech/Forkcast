import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader, SuccessView } from '@/components/Flow';
import type { IconName } from '@/components/Icon';
import { AmountDisplay, Keypad } from '@/components/Keypad';
import { Btn, Chip, T } from '@/components/ui';
import { balanceOf, checkMove, everyday, holderName, type Txn } from '@/lib/ledger';
import { money, typedToCents, typeKey } from '@/lib/money';
import { move, useBank } from '@/lib/store';
import { S, usePalette } from '@/theme';

/** Moves money between your own accounts and goals: instant, free, and no PIN needed. */
export default function Move() {
  const router = useRouter();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string; to?: string }>();
  const { books } = useBank();
  const holders = books ? [
    ...books.accounts.map(a => ({ id: a.id, name: a.name, icon: (a.kind === 'savings' ? 'savings' : 'wallet') as IconName })),
    ...books.goals.map(g => ({ id: g.id, name: g.name, icon: g.icon as IconName })),
  ] : [];
  const known = (id?: string) => (id && holders.some(h => h.id === id) ? id : undefined);
  const start = known(params.from) ?? (books ? everyday(books).id : '');
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(known(params.to) ?? holders.find(h => h.id !== start)?.id ?? '');
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [moved, setMoved] = useState<Txn | null>(null);
  if (!books) return null;

  const amount = typedToCents(raw);
  const close = () => router.back();
  const choose = (side: 'from' | 'to', id: string) => {
    setError(null);
    if (side === 'from') { setFrom(id); if (id === to) setTo(holders.find(h => h.id !== id)?.id ?? ''); }
    else { setTo(id); if (id === from) setFrom(holders.find(h => h.id !== id)?.id ?? ''); }
  };
  const picker = (side: 'from' | 'to') => (
    <View style={{ gap: S.sm }}>
      <T v="label">{side === 'from' ? 'From' : 'To'}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.sm }}>
        {holders.map(h => (
          <Chip key={h.id} icon={h.icon} label={side === 'from' ? `${h.name} · ${money(balanceOf(books, h.id), { whole: true })}` : h.name}
            selected={(side === 'from' ? from : to) === h.id} onPress={() => choose(side, h.id)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pal.paper }} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, padding: S.lg, paddingBottom: S.xxl + (process.env.EXPO_OS === 'ios' ? 0 : insets.bottom), gap: S.lg, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      {moved ? (
        <>
          <FlowHeader title="" done={close} />
          <SuccessView books={books} txn={moved} amount={-moved.amount} onDone={close} title="Moved"
            lines={[`from ${holderName(books, from)} to ${holderName(books, to)}`, `${money(balanceOf(books, to))} in ${holderName(books, to)} now`]} />
        </>
      ) : (
        <>
          <FlowHeader title="Move money" cancel={close} />
          {picker('from')}
          {picker('to')}
          <AmountDisplay raw={raw} error={error} caption={`${money(balanceOf(books, from))} in ${holderName(books, from)}`} />
          <Keypad left="dot" onKey={k => { setRaw(r => typeKey(r, k)); setError(null); }} />
          <Btn title={amount ? `Move ${money(amount)}` : 'Move'} disabled={!amount} onPress={() => {
            const input = { from, to, amount };
            const p = checkMove(books, input);
            if (p) return setError(p);
            const r = move(input);
            if (!r.ok) return setError(r.error);
            setMoved(r.value[0]);
          }} />
        </>
      )}
    </ScrollView>
  );
}
