import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader, SuccessView } from '@/components/Flow';
import { AmountDisplay, Keypad } from '@/components/Keypad';
import { PinConfirm } from '@/components/LockScreen';
import { Btn, Chip, DetailLine, Field, Group, ICON_INSET, IconWell, Notice, Row, SearchField, T } from '@/components/ui';
import { biller as findBiller, BILLER_GROUPS, BILLERS, checkBillRef, masked, type Biller, type BillerGroupId } from '@/lib/catalog';
import { useNow } from '@/lib/clock';
import { balanceOf, checkBill, everyday, type Txn } from '@/lib/ledger';
import { money, typedToCents, typeKey } from '@/lib/money';
import { payBill, saveBiller, useBank } from '@/lib/store';
import { S, usePalette } from '@/theme';

type Step = 'biller' | 'ref' | 'amount' | 'review' | 'pin' | 'done';
const groupIcon = (b: Biller) => BILLER_GROUPS.find(g => g.id === b.group)?.icon ?? 'bills';

export default function PayBill() {
  const router = useRouter();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ biller?: string; ref?: string }>();
  const { books } = useBank();
  const presetBiller = params.biller ? findBiller(params.biller) ?? null : null;
  const presetRef = presetBiller && params.ref && !checkBillRef(presetBiller, params.ref) ? params.ref : '';
  const [step, setStep] = useState<Step>(presetBiller ? (presetRef ? 'amount' : 'ref') : 'biller');
  const [biller, setBiller] = useState<Biller | null>(presetBiller);
  const [ref, setRef] = useState(presetRef);
  const [remember, setRemember] = useState(!presetRef);
  const [group, setGroup] = useState<BillerGroupId | null>(null);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState(books ? everyday(books).id : '');
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState<Txn | null>(null);
  const now = useNow();
  if (!books) return null;

  const amount = typedToCents(raw);
  const close = () => router.back();
  const problem = () => (biller ? checkBill(books, { from, biller, ref, amount }, now) : 'Choose a biller');
  const savedFor = (b: Biller) => books.billers.find(sb => sb.biller === b.id);
  const next = () => {
    if (!biller) return;
    const p = checkBillRef(biller, ref);
    if (p) setError(p);
    else { setError(null); setStep('amount'); }
  };

  const body = (() => {
    switch (step) {
      case 'biller': {
        const q = query.trim().toLowerCase();
        const list = BILLERS.filter(b => (!group || b.group === group) && (!q || b.name.toLowerCase().includes(q)));
        return (
          <>
            <FlowHeader title="Pay a bill" cancel={close} />
            <SearchField value={query} onChangeText={setQuery} placeholder="Search billers" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
              {BILLER_GROUPS.map(g => <Chip key={g.id} label={g.label} icon={g.icon} selected={group === g.id} onPress={() => setGroup(group === g.id ? null : g.id)} />)}
            </View>
            {list.length ? (
              <Group inset={ICON_INSET}>
                {list.map(b => {
                  const saved = savedFor(b);
                  return (
                    <Row key={b.id} title={b.name} sub={saved ? `Saved · ${masked(saved.ref)}` : BILLER_GROUPS.find(g => g.id === b.group)?.label}
                      leading={<IconWell icon={groupIcon(b)} />} chevron
                      onPress={() => {
                        setBiller(b); setError(null);
                        if (saved) { setRef(saved.ref); setRemember(false); setStep('amount'); } else { setRef(''); setRemember(true); setStep('ref'); }
                      }} />
                  );
                })}
              </Group>
            ) : <Notice text={`No billers match “${query.trim()}”.`} />}
          </>
        );
      }
      case 'ref':
        return (
          <>
            <FlowHeader title={biller?.name ?? 'Biller'} back={presetBiller ? undefined : () => setStep('biller')} cancel={presetBiller ? close : undefined} />
            {biller ? (
              <>
                <Field label={biller.refLabel} value={ref} onChangeText={t => { setRef(t); setError(null); }} keyboardType="number-pad" maxLength={20}
                  placeholder={biller.ref === 'mobile' ? '09XX XXX XXXX' : biller.ref === 'card' ? '16 digits' : 'From your latest bill'}
                  error={error} autoFocus returnKeyType="next" onSubmitEditing={() => next()} />
                <Group>
                  <Row title="Save this biller" sub="Pay it in two taps next time" trailing={<Switch value={remember} onValueChange={setRemember} accessibilityLabel="Save this biller" />} />
                </Group>
                <Btn title="Continue" onPress={() => next()} />
              </>
            ) : null}
          </>
        );
      case 'amount':
        return (
          <>
            <FlowHeader title="How much?" back={() => setStep(presetRef ? 'biller' : 'ref')} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              {biller ? <IconWell icon={groupIcon(biller)} size={36} /> : null}
              <View style={{ flex: 1 }}>
                <T v="label">{biller?.name}</T>
                <T v="small" color={pal.muted}>{biller?.refLabel} {masked(ref)}</T>
              </View>
            </View>
            <AmountDisplay raw={raw} error={error} caption={`${money(balanceOf(books, from))} available in ${books.accounts.find(a => a.id === from)?.name}`} />
            <Keypad left="dot" onKey={k => { setRaw(r => typeKey(r, k)); setError(null); }} />
            <Btn title="Continue" disabled={!amount} onPress={() => { const p = problem(); if (p) setError(p); else setStep('review'); }} />
          </>
        );
      case 'review':
        return (
          <>
            <FlowHeader title="Review" back={() => setStep('amount')} />
            <View style={{ alignItems: 'center', gap: S.sm }}>
              {biller ? <IconWell icon={groupIcon(biller)} size={56} /> : null}
              <T v="sub" color={pal.muted}>You’re paying</T>
              <T v="display">{money(amount)}</T>
              <T v="sub">to {biller?.name}</T>
            </View>
            <View style={{ gap: S.sm }}>
              <T v="label">From</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
                {books.accounts.map(a => <Chip key={a.id} label={`${a.name} · ${money(balanceOf(books, a.id), { whole: true })}`} selected={from === a.id} onPress={() => { setFrom(a.id); setError(null); }} />)}
              </View>
            </View>
            <View style={{ backgroundColor: pal.surface, borderRadius: 14, padding: S.lg }}>
              <DetailLine label="Biller" value={biller?.name ?? ''} />
              <DetailLine label={biller?.refLabel ?? 'Reference'} value={masked(ref)} />
              <DetailLine label="Posts to your account" value="Within 1 banking day" />
              <DetailLine label="Fee" value="Free" />
              <View style={{ height: 1, backgroundColor: pal.line, marginVertical: S.sm }} />
              <DetailLine label="Total" value={money(amount)} strong />
            </View>
            {error ? <Notice tone="danger" text={error} /> : null}
            <Btn title={`Pay ${money(amount)}`} onPress={() => { const p = problem(); if (p) setError(p); else { setError(null); setStep('pin'); } }} />
          </>
        );
      case 'pin':
        return (
          <>
            <FlowHeader title="Confirm" back={() => setStep('review')} />
            <PinConfirm reason={`To pay ${money(amount)} to ${biller?.name}`} onConfirmed={() => {
              if (!biller) return;
              const r = payBill({ from, biller, ref, amount });
              if (!r.ok) { setError(r.error); setStep('review'); return; }
              if (remember) saveBiller(biller.id, ref);
              setPaid(r.value);
              setStep('done');
            }} />
          </>
        );
      case 'done':
        return (
          <>
            <FlowHeader title="" done={close} />
            {paid ? (
              <SuccessView books={books} txn={paid} amount={-paid.amount} onDone={close} title="Bill paid"
                lines={[`to ${paid.title} · ${masked(ref)}`, 'It shows on your biller account within 1 banking day.', ...(remember ? ['Saved for next time.'] : [])]} />
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
