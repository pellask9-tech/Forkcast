import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { FlowHeader, SuccessView } from '@/components/Flow';
import { AmountDisplay, Keypad } from '@/components/Keypad';
import { PinConfirm } from '@/components/LockScreen';
import { RecipientForm } from '@/components/RecipientForm';
import { Btn, Chip, DetailLine, Field, Group, ICON_INSET, IconWell, Notice, Row, SearchField, Segmented, T } from '@/components/ui';
import { FEES, INSTANT_LIMIT } from '@/config';
import { bankName, masked } from '@/lib/catalog';
import { useNow } from '@/lib/clock';
import { nextBankingDay, dayKey, dayLabel, timeLabel } from '@/lib/dates';
import { balanceOf, checkSend, everyday, type Method, type Recipient, type SendInput, type Txn } from '@/lib/ledger';
import { money, typedToCents, typeKey } from '@/lib/money';
import { arrival } from '@/lib/receipt';
import { send, useBank } from '@/lib/store';
import { S, usePalette } from '@/theme';

type Step = 'who' | 'new' | 'amount' | 'review' | 'pin' | 'done';

export default function Send() {
  const router = useRouter();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ to?: string }>();
  const { books } = useBank();
  const preset = books?.recipients.find(r => r.id === params.to) ?? null;
  const [step, setStep] = useState<Step>(preset ? 'amount' : 'who');
  const [to, setTo] = useState<Recipient | null>(preset);
  const [from, setFrom] = useState(books ? everyday(books).id : '');
  const [raw, setRaw] = useState('');
  const [chosenMethod, setChosenMethod] = useState<Method | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sent, setSent] = useState<Txn | null>(null);
  const now = useNow();
  if (!books) return null;

  const amount = typedToCents(raw);
  // InstaPay unless it's over the InstaPay cap, until the person picks one themselves.
  const method: Method = chosenMethod ?? (amount > INSTANT_LIMIT ? 'pesonet' : 'instapay');
  const input = (): SendInput | null => (to ? { from, to: { name: to.name, bank: to.bank, number: to.number }, amount, method, note } : null);
  const problem = () => { const i = input(); return i ? checkSend(books, i, now) : 'Choose who to pay'; };
  const close = () => router.back();
  const pick = (r: Recipient) => { setTo(r); setError(null); setStep('amount'); };

  const body = (() => {
    switch (step) {
      case 'who': {
        const q = query.trim().toLowerCase();
        const people = books.recipients.filter(r => !q || [r.name, bankName(r.bank), r.number].some(s => s.toLowerCase().includes(q)));
        return (
          <>
            <FlowHeader title="Send money" cancel={close} />
            <SearchField value={query} onChangeText={setQuery} placeholder="Name, bank or number" />
            <Group inset={ICON_INSET}>
              <Row title="Someone new" sub="Any bank or e-wallet in the Philippines" leading={<IconWell icon="add" />} chevron onPress={() => setStep('new')} />
            </Group>
            {people.length ? (
              <View style={{ gap: S.sm }}>
                <T v="label" color={pal.muted} style={{ paddingHorizontal: S.xs }}>Your people</T>
                <Group inset={ICON_INSET}>
                  {people.map(r => (
                    <Row key={r.id} title={r.name} sub={`${bankName(r.bank)} ${masked(r.number)}`} leading={<Avatar name={r.name} />} chevron onPress={() => pick(r)} />
                  ))}
                </Group>
              </View>
            ) : q ? <Notice text={`No one matches “${query.trim()}”.`} /> : null}
            <Notice text="Moving money between your own accounts or goals? Use Move money instead: it’s instant and doesn’t count toward your daily limit." />
          </>
        );
      }
      case 'new':
        return (
          <>
            <FlowHeader title="Someone new" back={() => setStep('who')} />
            <RecipientForm submitLabel="Continue" onSaved={pick} />
          </>
        );
      case 'amount':
        return (
          <>
            <FlowHeader title="How much?" back={preset ? undefined : () => setStep('who')} cancel={preset ? close : undefined} />
            {to ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                <Avatar name={to.name} size={36} />
                <View style={{ flex: 1 }}>
                  <T v="label" numberOfLines={1}>To {to.name}</T>
                  <T v="small" color={pal.muted}>{bankName(to.bank)} {masked(to.number)}</T>
                </View>
              </View>
            ) : null}
            <AmountDisplay raw={raw} error={error} caption={`${money(balanceOf(books, from))} available in ${books.accounts.find(a => a.id === from)?.name}`} />
            <Segmented value={method} onChange={m => { setChosenMethod(m); setError(null); }}
              options={[{ value: 'instapay', label: 'InstaPay · instant' }, { value: 'pesonet', label: 'PESONet · next day' }]} />
            <Keypad left="dot" onKey={k => { setRaw(r => typeKey(r, k)); setError(null); }} />
            <Btn title="Continue" disabled={!amount} onPress={() => {
              const p = problem();
              if (p) setError(p); else setStep('review');
            }} />
          </>
        );
      case 'review': {
        const fee = FEES[method];
        const lands = method === 'pesonet' ? (() => { const at = nextBankingDay(now); return `${dayLabel(dayKey(at))} by ${timeLabel(at)}`; })() : 'In a few seconds';
        return (
          <>
            <FlowHeader title="Review" back={() => setStep('amount')} />
            <View style={{ alignItems: 'center', gap: S.sm }}>
              {to ? <Avatar name={to.name} size={56} /> : null}
              <T v="sub" color={pal.muted}>You’re sending</T>
              <T v="display">{money(amount)}</T>
              <T v="sub">to {to?.name}</T>
            </View>
            <View style={{ gap: S.sm }}>
              <T v="label">From</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
                {books.accounts.map(a => <Chip key={a.id} label={`${a.name} · ${money(balanceOf(books, a.id), { whole: true })}`} selected={from === a.id} onPress={() => { setFrom(a.id); setError(null); }} />)}
              </View>
            </View>
            <View style={{ backgroundColor: pal.surface, borderRadius: 14, padding: S.lg }}>
              <DetailLine label="To" value={to?.name ?? ''} />
              <DetailLine label="Bank or e-wallet" value={to ? `${bankName(to.bank)} ${masked(to.number)}` : ''} />
              <DetailLine label="Sent with" value={method === 'instapay' ? 'InstaPay' : 'PESONet'} />
              <DetailLine label="Arrives" value={lands} />
              <DetailLine label="Fee" value={fee ? money(fee) : 'Free'} />
              <View style={{ height: 1, backgroundColor: pal.line, marginVertical: S.sm }} />
              <DetailLine label="Total" value={money(amount + fee)} strong />
            </View>
            <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="What’s it for?" maxLength={80} returnKeyType="done" />
            {error ? <Notice tone="danger" text={error} /> : null}
            <Btn title={`Send ${money(amount)}`} onPress={() => {
              const p = problem();
              if (p) setError(p); else { setError(null); setStep('pin'); }
            }} />
          </>
        );
      }
      case 'pin':
        return (
          <>
            <FlowHeader title="Confirm" back={() => setStep('review')} />
            <PinConfirm reason={`To send ${money(amount)} to ${to?.name}`} onConfirmed={() => {
              const i = input();
              if (!i) return;
              const r = send(i);
              if (!r.ok) { setError(r.error); setStep('review'); return; }
              setSent(r.value);
              setStep('done');
            }} />
          </>
        );
      case 'done':
        return (
          <>
            <FlowHeader title="" done={close} />
            {sent ? (
              <SuccessView books={books} txn={sent} amount={-sent.amount} onDone={close} pending={sent.status === 'pending'}
                title={sent.status === 'pending' ? 'Transfer on its way' : 'Money sent'}
                lines={[`to ${sent.title} · ${bankName(sent.party?.bank)} ${masked(sent.party?.number ?? '')}`, arrival(sent) ?? 'Arrived in their account']} />
            ) : null}
          </>
        );
    }
  })();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pal.paper }} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ flexGrow: 1, padding: S.lg, paddingBottom: S.xxl + (process.env.EXPO_OS === 'ios' ? 0 : insets.bottom), gap: S.lg, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      {body}
    </ScrollView>
  );
}
