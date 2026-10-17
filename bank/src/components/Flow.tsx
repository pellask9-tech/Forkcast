import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { Animated, BackHandler, View } from 'react-native';

import type { Books, Txn } from '@/lib/ledger';
import { money } from '@/lib/money';
import { shareReceipt } from '@/lib/receipt';
import { S, usePalette } from '@/theme';
import { HeaderAction } from './Header';
import { Icon } from './Icon';
import { Btn, Group, IconBtn, Row, T } from './ui';

/**
 * The navigation bar for a step in a multi-step flow: Back goes to the previous step (Android's back
 * button too), Cancel closes the flow, and the last step shows Done instead.
 */
export function FlowHeader({ title, back, cancel, done }: { title: string; back?: () => void; cancel?: () => void; done?: () => void }) {
  const onHardwareBack = useEffectEvent(() => {
    const handler = back ?? cancel ?? done;
    if (!handler) return false;
    handler();
    return true;
  });
  useEffect(() => {
    if (process.env.EXPO_OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => onHardwareBack());
    return () => sub.remove();
  }, []);
  return (
    <Stack.Screen options={{
      title,
      headerBackVisible: false,
      headerLeft: back ? () => <HeaderAction kind="back" onPress={back} /> : cancel ? () => <HeaderAction kind="cancel" onPress={cancel} /> : () => null,
      headerRight: done ? () => <HeaderAction kind="done" onPress={done} /> : undefined,
    }} />
  );
}

/** The end of a flow: a tick, what happened, the reference, and a way to share the receipt. */
export function SuccessView({ title, amount, lines, books, txn, onDone, pending }: {
  title: string; amount: number; lines: string[]; books: Books; txn?: Txn; onDone: () => void; pending?: boolean;
}) {
  const pal = usePalette();
  const [scale] = useState(() => new Animated.Value(0.6));
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: process.env.EXPO_OS !== 'web' }).start();
    if (process.env.EXPO_OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [scale]);
  return (
    <View style={{ gap: S.xl }}>
      <View style={{ alignItems: 'center', gap: S.md, paddingTop: S.xl }}>
        <Animated.View style={{ transform: [{ scale }], width: 84, height: 84, borderRadius: 42, backgroundColor: pending ? pal.sunken : pal.positive, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={pending ? 'clockCircle' : 'check'} size={40} color={pending ? pal.ink : '#FFFFFF'} />
        </Animated.View>
        <T v="h2" accessibilityRole="header" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>{title}</T>
        <T v="display" style={{ textAlign: 'center' }} selectable>{money(amount)}</T>
        {lines.map(l => <T key={l} v="sub" color={pal.muted} style={{ textAlign: 'center' }}>{l}</T>)}
      </View>
      {txn ? (
        <Group>
          <Row title="Reference" value={txn.ref}
            trailing={<IconBtn icon="copy" label="Copy reference" size={32} tone="clear" onPress={async () => { await Clipboard.setStringAsync(txn.ref); setNote('Reference copied'); }} />} />
        </Group>
      ) : null}
      {note ? <T v="small" color={pal.muted} style={{ textAlign: 'center', marginTop: -S.md }} accessibilityLiveRegion="polite">{note}</T> : null}
      <View style={{ gap: S.md }}>
        {txn ? <Btn title="Share receipt" icon="share" kind="secondary" onPress={async () => { if ((await shareReceipt(books, txn)) === 'copied') setNote('Receipt copied'); }} /> : null}
        <Btn title="Done" onPress={onDone} />
      </View>
    </View>
  );
}
