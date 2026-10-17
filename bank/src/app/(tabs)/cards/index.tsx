import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Switch, useWindowDimensions, View } from 'react-native';

import { CardFace } from '@/components/CardFace';
import { Meter } from '@/components/Charts';
import { Icon, type IconName } from '@/components/Icon';
import { usePinCheck } from '@/components/LockScreen';
import { Screen } from '@/components/Screen';
import { TxnRow } from '@/components/TxnRow';
import { Group, ICON_INSET, IconWell, Notice, Row, SectionHeader, Segmented, T, tap } from '@/components/ui';
import { masked } from '@/lib/catalog';
import { useNow } from '@/lib/clock';
import { cardSpentToday, type Txn } from '@/lib/ledger';
import { money } from '@/lib/money';
import { replaceCard, testCardPayment, updateCard, useBank } from '@/lib/store';
import { S, usePalette } from '@/theme';

const LIMITS = [5_000_00, 10_000_00, 20_000_00, 50_000_00, 100_000_00];
const REVEAL_SECONDS = 30;

export default function Cards() {
  const router = useRouter();
  const pal = usePalette();
  const { width: screen } = useWindowDimensions();
  const { books } = useBank();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [result, setResult] = useState<Txn | null>(null);
  const pin = usePinCheck();
  const now = useNow();

  // Card details hide themselves again after half a minute.
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(null), REVEAL_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [revealed]);

  if (!books) return null;
  const width = Math.min(screen - S.lg * 2, 380);
  const card = books.cards[Math.min(index, books.cards.length - 1)];
  const spent = cardSpentToday(books, card.id, now);
  const recent = books.txns.filter(t => t.card === card.id).slice(0, 5);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (width + S.md));
    if (i !== index && i >= 0 && i < books.cards.length) { setIndex(i); setResult(null); }
  };
  const showDetails = async () => {
    if (revealed === card.id) return setRevealed(null);
    if (await pin.ask(`Show the details of your ${card.name.toLowerCase()}`)) setRevealed(card.id);
  };
  const freeze = () => {
    updateCard(card.id, { frozen: !card.frozen });
    if (process.env.EXPO_OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };
  const testPay = () => {
    const r = testCardPayment(card.id);
    if (!r.ok) return;
    setResult(r.value);
    if (process.env.EXPO_OS !== 'web') {
      Haptics.notificationAsync(r.value.status === 'declined' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };
  const replace = () => Alert.alert(
    `Replace your ${card.name.toLowerCase()}?`,
    `The card ending ${card.number.slice(-4)} stops working straight away and you get a new number. Use this if it was lost or stolen.`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Replace card', style: 'destructive', onPress: () => { replaceCard(card.id); setRevealed(null); setResult(null); } }],
  );
  const toggle = (label: string, sub: string, icon: IconName, key: 'online' | 'contactless' | 'atm' | 'abroad') => (
    <Row title={label} sub={sub} leading={<IconWell icon={icon} />}
      trailing={<Switch value={card[key]} onValueChange={v => updateCard(card.id, { [key]: v })} accessibilityLabel={label} disabled={card.frozen} />} />
  );

  return (
    <Screen tab>
      <View style={{ gap: S.md }}>
        <ScrollView horizontal snapToInterval={width + S.md} decelerationRate="fast" showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32}
          style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.md }}>
          {books.cards.map(c => <CardFace key={c.id} card={c} holderName={books.owner.name} revealed={revealed === c.id} width={width} />)}
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessible accessibilityLabel={`Card ${index + 1} of ${books.cards.length}`}>
          {books.cards.map((c, i) => <View key={c.id} style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? pal.ink : pal.line }} />)}
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
        <Action icon="freeze" label={card.frozen ? 'Unfreeze' : 'Freeze'} active={card.frozen} onPress={freeze} />
        <Action icon={revealed === card.id ? 'eyeOff' : 'eye'} label={revealed === card.id ? 'Hide details' : 'Show details'} onPress={showDetails} />
        <Action icon="cart" label="Test payment" onPress={testPay} />
      </View>

      {revealed === card.id ? (
        <Notice icon="info" text={`Details hide again after ${REVEAL_SECONDS} seconds. Never share your CVV with anyone who calls or messages you.`} />
      ) : null}
      {revealed === card.id ? (
        <Group>
          <Row title="Copy card number" leading={<IconWell icon="copy" />} onPress={() => Clipboard.setStringAsync(card.number)} />
        </Group>
      ) : null}
      {result ? <PaymentResult t={result} /> : null}
      {card.frozen ? <Notice text="This card is frozen. Payments and withdrawals are declined until you unfreeze it." icon="freeze" /> : null}

      <View>
        <SectionHeader title="Controls" />
        <Group inset={ICON_INSET}>
          {toggle('Online payments', 'Shops, apps and subscriptions', 'online', 'online')}
          {card.kind === 'physical' ? toggle('Contactless', 'Tap to pay in shops', 'contactless', 'contactless') : null}
          {card.kind === 'physical' ? toggle('ATM withdrawals', 'Cash from any ATM', 'atm', 'atm') : null}
          {toggle('Payments abroad', 'In other countries and currencies', 'globe', 'abroad')}
        </Group>
      </View>

      <View style={{ gap: S.md }}>
        <SectionHeader title="Daily spending limit" />
        <Segmented options={LIMITS.map(l => ({ value: l, label: money(l, { whole: true }) }))} value={card.dailyLimit}
          onChange={v => updateCard(card.id, { dailyLimit: v })} />
        <View style={{ gap: S.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="small" color={pal.muted}>Spent today on this card</T>
            <T v="small" tabular>{money(spent, { whole: true })} of {money(card.dailyLimit, { whole: true })}</T>
          </View>
          <Meter value={spent} max={card.dailyLimit} />
        </View>
      </View>

      {recent.length ? (
        <View>
          <SectionHeader title="Card activity" action="See all" onAction={() => router.push('/activity')} />
          <Group inset={ICON_INSET}>
            {recent.map(t => <TxnRow key={t.id} t={t} now={now} onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })} />)}
          </Group>
        </View>
      ) : null}

      <View>
        <SectionHeader title="Lost or stolen?" />
        <Group inset={ICON_INSET}>
          <Row title="Replace this card" sub={`Cancels ${masked(card.number)} and issues a new number`} leading={<IconWell icon="replace" />} onPress={replace} destructive />
        </Group>
      </View>
      {pin.sheet}
    </Screen>
  );
}

function Action({ icon, label, onPress, active }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  const pal = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!active }} onPress={() => { tap(); onPress(); }} style={{ alignItems: 'center', gap: S.sm, width: 96 }}>
      {({ pressed }) => (
        <>
          <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? pal.ink : pressed ? pal.sunken : pal.surface }}>
            <Icon name={icon} size={22} color={active ? pal.paper : pal.ink} />
          </View>
          <T v="small" style={{ fontWeight: '600', textAlign: 'center' }}>{label}</T>
        </>
      )}
    </Pressable>
  );
}

/** What happened to the test payment: approved and on hold, or declined and why. */
function PaymentResult({ t }: { t: Txn }) {
  const declined = t.status === 'declined';
  return (
    <Notice tone={declined ? 'danger' : 'info'} icon={declined ? 'xCircle' : 'checkCircle'}
      text={declined
        ? `Declined: ${money(-t.amount)} at ${t.title}. ${t.reason}.`
        : `Approved: ${money(-t.amount)} at ${t.title}. It shows as pending until the shop collects it.`} />
  );
}

