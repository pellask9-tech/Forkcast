import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { BigAmount } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { TxnRow } from '@/components/TxnRow';
import { Btn, Group, ICON_INSET, IconBtn, Notice, Row, SectionHeader, T } from '@/components/ui';
import { BANK_NAME, SAVINGS_RATE } from '@/config';
import { masked, spaced } from '@/lib/catalog';
import { useNow } from '@/lib/clock';
import { balanceOf } from '@/lib/ledger';
import { money } from '@/lib/money';
import { useBank } from '@/lib/store';
import { S, usePalette } from '@/theme';

export default function AccountScreen() {
  const router = useRouter();
  const pal = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books, prefs } = useBank();
  const [shown, setShown] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const now = useNow();
  const account = books?.accounts.find(a => a.id === id);
  if (!books || !account) return <Screen><Notice text="This account isn’t available." /></Screen>;

  const txns = books.txns.filter(t => t.holder === account.id);
  const year = new Date(now).getFullYear();
  const interest = txns.filter(t => t.kind === 'interest' && new Date(t.at).getFullYear() === year).reduce((s, t) => s + t.amount, 0);
  const details = `${books.owner.name}\n${BANK_NAME} (demo) · ${account.name}\nAccount number ${spaced(account.number)}`;

  return (
    <>
      <Stack.Screen options={{ title: account.name }} />
      <Screen>
        <View style={{ gap: S.xs }}>
          <T v="sub" color={pal.muted}>Available balance</T>
          <BigAmount value={balanceOf(books, account.id)} hidden={prefs.hideBalances} size={40} />
          {account.kind === 'savings' ? <T v="sub" color={pal.muted}>Earns {SAVINGS_RATE}% a year, paid monthly</T> : null}
        </View>

        <View style={{ flexDirection: 'row', gap: S.md }}>
          <Btn title="Add money" icon="add" kind="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/add-money', params: { to: account.id } })} />
          <Btn title="Move" icon="move" kind="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/move', params: { from: account.id } })} />
        </View>

        <View>
          <SectionHeader title="Account details" />
          <Group>
            <Row title="Account number" value={shown ? spaced(account.number) : masked(account.number)}
              trailing={
                <View style={{ flexDirection: 'row', gap: S.xs }}>
                  <IconBtn icon={shown ? 'eyeOff' : 'eye'} label={shown ? 'Hide account number' : 'Show account number'} size={32} tone="clear" onPress={() => setShown(v => !v)} />
                  <IconBtn icon="copy" label="Copy account number" size={32} tone="clear" onPress={async () => { await Clipboard.setStringAsync(account.number); setNote('Account number copied'); }} />
                </View>
              } />
            <Row title="Account name" value={books.owner.name} />
            <Row title="Type" value={account.kind === 'savings' ? 'Savings' : 'Everyday (checking)'} />
            {account.kind === 'savings' ? <Row title={`Interest earned in ${year}`} value={money(interest)} /> : null}
          </Group>
          {note ? <T v="small" color={pal.muted} style={{ marginTop: S.sm, paddingHorizontal: S.xs }} accessibilityLiveRegion="polite">{note}</T> : null}
        </View>
        <Btn title="Share account details" icon="share" kind="ghost" onPress={() => Share.share({ message: details }).catch(() => {})} />

        <View>
          <SectionHeader title="Activity" action={txns.length > 20 ? 'See all' : undefined} onAction={() => router.push({ pathname: '/activity', params: { account: account.id } })} />
          {txns.length ? (
            <Group inset={ICON_INSET}>
              {txns.slice(0, 20).map(t => <TxnRow key={t.id} t={t} now={now} onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })} />)}
            </Group>
          ) : <Notice text="No payments yet." />}
        </View>
      </Screen>
    </>
  );
}
