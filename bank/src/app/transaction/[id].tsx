import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetTitle } from '@/components/Header';
import { TxnLeading } from '@/components/TxnRow';
import { Badge, Btn, Chip, Field, Group, IconBtn, Notice, Row, T } from '@/components/ui';
import { bankName, category, masked, SPEND_CATEGORIES } from '@/lib/catalog';
import { dateTimeLabel } from '@/lib/dates';
import { holderName, isGoal, type Txn } from '@/lib/ledger';
import { money } from '@/lib/money';
import { arrival, shareReceipt } from '@/lib/receipt';
import { editTxn, useBank } from '@/lib/store';
import { S, usePalette } from '@/theme';

function status(t: Txn) {
  if (t.status === 'declined') return { label: 'Declined', icon: 'xCircle', tone: 'danger' } as const;
  if (t.status === 'pending') return { label: arrival(t) ?? 'Pending', icon: 'clockCircle', tone: 'muted' } as const;
  return { label: 'Completed', icon: 'checkCircle', tone: 'positive' } as const;
}

export default function TransactionSheet() {
  const router = useRouter();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books } = useBank();
  const [picking, setPicking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const t = books?.txns.find(x => x.id === id);

  if (!books || !t) {
    return (
      <View style={{ flex: 1, backgroundColor: pal.paper, padding: S.xl, gap: S.xl }}>
        <SheetTitle title="Details" onDone={() => router.back()} />
        <Notice text="This payment isn’t available any more." />
      </View>
    );
  }

  const acct = books.accounts.find(a => a.id === t.holder);
  const pair = t.pair ? books.txns.find(x => x.id === t.pair) : undefined;
  const card = t.card ? books.cards.find(c => c.id === t.card) : undefined;
  const canRecategorize = t.amount < 0 && t.kind !== 'move' && t.kind !== 'fee';
  const s = status(t);
  const copy = async (label: string, value: string) => { await Clipboard.setStringAsync(value); setCopied(label); };
  const saveNote = () => { if (note !== null) editTxn(t.id, { note }); };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pal.paper }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xl, gap: S.xl, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <SheetTitle title="Details" onDone={() => { saveNote(); router.back(); }} />

      <View style={{ alignItems: 'center', gap: S.sm }}>
        <TxnLeading t={t} size={64} />
        <T v="h3" style={{ textAlign: 'center', marginTop: S.xs }} selectable>{t.title}</T>
        <Text selectable style={{ fontSize: 36, fontWeight: '700', letterSpacing: -1, color: t.status === 'declined' ? pal.muted : t.amount > 0 ? pal.positive : pal.ink, textDecorationLine: t.status === 'declined' ? 'line-through' : 'none' }}>
          {money(t.amount, { sign: 'always' })}
        </Text>
        <Badge label={s.label} icon={s.icon} tone={s.tone} />
        <T v="small" color={pal.muted}>{dateTimeLabel(t.at)}</T>
      </View>

      {t.status === 'declined' ? <Notice tone="danger" text={`${t.reason ?? 'The payment was refused'}. No money left your account.`} /> : null}

      <Group>
        <Row title={t.amount < 0 ? 'From' : 'Into'} value={acct ? `${acct.name} ${masked(acct.number)}` : holderName(books, t.holder)} />
        {t.party && t.kind !== 'bill' ? (
          <Row title={t.amount < 0 ? 'To' : 'From'} sub={t.party.bank ? `${bankName(t.party.bank)} ${masked(t.party.number ?? '')}` : undefined} value={t.party.name} />
        ) : null}
        {t.kind === 'bill' && t.party?.number ? <Row title="Biller reference" value={masked(t.party.number)} /> : null}
        {t.method ? <Row title="Sent with" value={t.method === 'instapay' ? 'InstaPay · instant' : 'PESONet · next banking day'} /> : null}
        {card ? <Row title={card.name} value={masked(card.number)} sub={t.online ? 'Online payment' : 'In store'} /> : null}
        {canRecategorize ? <Row title="Category" value={category(t.category).label} chevron onPress={() => setPicking(p => !p)} /> : null}
        {pair ? (
          <Row title={pair.amount > 0 ? 'Moved to' : 'Moved from'} value={holderName(books, pair.holder)} chevron
            onPress={() => router.push(isGoal(books, pair.holder) ? { pathname: '/goal/[id]', params: { id: pair.holder } } : { pathname: '/account/[id]', params: { id: pair.holder } })} />
        ) : null}
        <Row title="Reference" value={t.ref} trailing={<IconBtn icon="copy" label="Copy reference" size={32} tone="clear" onPress={() => copy('Reference', t.ref)} />} />
      </Group>
      {copied ? <T v="small" color={pal.muted} style={{ textAlign: 'center', marginTop: -S.md }} accessibilityLiveRegion="polite">{copied} copied</T> : null}

      {picking ? (
        <View style={{ gap: S.md }}>
          <T v="label">Change category</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {SPEND_CATEGORIES.map(c => (
              <Chip key={c.id} label={c.label} icon={c.icon} selected={t.category === c.id} onPress={() => { editTxn(t.id, { category: c.id }); setPicking(false); }} />
            ))}
          </View>
          <T v="small" color={pal.muted}>Insights and budgets use the new category straight away.</T>
        </View>
      ) : null}

      <Field label="Note" value={note ?? t.note ?? ''} onChangeText={setNote} onBlur={saveNote} onSubmitEditing={saveNote}
        placeholder="Add a note for yourself" maxLength={80} returnKeyType="done" />

      <Btn title="Share receipt" icon="share" kind="secondary" onPress={async () => {
        if ((await shareReceipt(books, t)) === 'copied') setCopied('Receipt');
      }} />
    </ScrollView>
  );
}
