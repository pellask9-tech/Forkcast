import { View } from 'react-native';

import { category } from '@/lib/catalog';
import { dayKey, shortDate, timeLabel } from '@/lib/dates';
import type { Txn } from '@/lib/ledger';
import { money } from '@/lib/money';
import { usePalette } from '@/theme';
import { Avatar } from './Avatar';
import type { IconName } from './Icon';
import { Amount } from './Money';
import { IconWell, Row, T } from './ui';

/** What kind of entry this is, in a word or two ("Food & drink", "Salary", "Received"). */
export function kindLabel(t: Txn) {
  switch (t.kind) {
    case 'card': return category(t.category).label;
    case 'transfer': return t.amount > 0 ? 'Received' : category(t.category).label;
    case 'bill': return 'Bill payment';
    case 'salary': return 'Salary';
    case 'interest': return 'Interest';
    case 'deposit': return 'Cash in';
    case 'move': return 'Between your accounts';
    case 'atm': return 'Cash withdrawal';
    case 'fee': return 'Fee';
  }
}

export function txnIcon(t: Txn): IconName {
  switch (t.kind) {
    case 'bill': return 'bills';
    case 'salary': return 'bank';
    case 'interest': return 'savings';
    case 'deposit': return 'add';
    case 'move': return 'move';
    case 'atm': return 'atm';
    case 'fee': return 'percent';
    default: return category(t.category).icon;
  }
}

export function TxnLeading({ t, size = 40 }: { t: Txn; size?: number }) {
  return t.kind === 'transfer' && t.party ? <Avatar name={t.title} size={size} /> : <IconWell icon={txnIcon(t)} size={size} />;
}

export function txnSub(t: Txn) {
  if (t.status === 'declined') return `Declined · ${t.reason ?? 'Payment refused'}`;
  return t.status === 'pending' ? `Pending · ${kindLabel(t)}` : kindLabel(t);
}

/**
 * One entry: who or where, what kind and its status, then the amount with the time under it. Lists that
 * mix days pass `now`, and entries from before today show their date instead.
 */
export function TxnRow({ t, onPress, now }: { t: Txn; onPress?: () => void; now?: number }) {
  const pal = usePalette();
  const when = now !== undefined && dayKey(t.at) !== dayKey(now) ? shortDate(t.at) : timeLabel(t.at);
  return (
    <Row
      title={t.title}
      sub={txnSub(t)}
      leading={<TxnLeading t={t} />}
      trailing={
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Amount value={t.amount} v="body" struck={t.status === 'declined'} style={{ fontWeight: '600' }} />
          <T v="small" color={pal.muted} tabular>{when}</T>
        </View>
      }
      onPress={onPress}
      accessibilityLabel={`${t.title}, ${t.amount > 0 ? 'received' : 'paid'} ${money(Math.abs(t.amount))}, ${txnSub(t)}, ${when}`}
    />
  );
}
