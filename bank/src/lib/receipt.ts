import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

import { BANK_NAME } from '@/config';
import { bankName, masked } from './catalog';
import { dateTimeLabel, dayKey, dayLabel, timeLabel } from './dates';
import { holderName, type Books, type Txn } from './ledger';
import { money } from './money';

/** When a pending entry will clear, in words: "Arrives Monday, 19 October by 10:00 AM". */
export function arrival(t: Txn) {
  if (t.status !== 'pending' || !t.settleAt) return null;
  const day = dayLabel(dayKey(t.settleAt));
  const when = `${day === 'Today' || day === 'Tomorrow' ? day.toLowerCase() : day} by ${timeLabel(t.settleAt)}`;
  return t.kind === 'card' ? `Clears ${when}` : `Arrives ${when}`;
}

/** A plain-text receipt, the way it would be shared or pasted into a chat. */
export function receiptText(books: Books, t: Txn) {
  const acct = books.accounts.find(a => a.id === t.holder);
  const from = acct ? `${acct.name} ${masked(acct.number)}` : holderName(books, t.holder);
  const party = t.party ? `${t.party.name}${t.party.bank ? ` (${bankName(t.party.bank)} ${masked(t.party.number ?? '')})` : t.party.number ? ` (${masked(t.party.number)})` : ''}` : t.title;
  const lines = [
    `${BANK_NAME} receipt`,
    t.amount < 0 ? `${t.kind === 'bill' ? 'Paid' : 'Sent'} ${money(-t.amount)} to ${party}` : `Received ${money(t.amount)} from ${party}`,
    t.amount < 0 ? `From ${from}` : `Into ${from}`,
    `${dateTimeLabel(t.at)}${t.method ? ` · ${t.method === 'instapay' ? 'InstaPay' : 'PESONet'}` : ''}`,
    t.status === 'pending' ? arrival(t) : t.status === 'declined' ? `Declined: ${t.reason}` : 'Completed',
    `Reference ${t.ref}`,
    t.note ? `Note: ${t.note}` : null,
    '(Demo app: no real money moved.)',
  ];
  return lines.filter(Boolean).join('\n');
}

/** Opens the share sheet. Where sharing isn't available (some browsers), copies the receipt instead. */
export async function shareReceipt(books: Books, t: Txn): Promise<'shared' | 'copied'> {
  const message = receiptText(books, t);
  try {
    await Share.share({ message, title: `${BANK_NAME} receipt` });
    return 'shared';
  } catch {
    await Clipboard.setStringAsync(message);
    return 'copied';
  }
}
