import { useState } from 'react';
import { View } from 'react-native';

import { BANKS } from '@/lib/catalog';
import type { Recipient } from '@/lib/ledger';
import { addRecipient } from '@/lib/store';
import { S, usePalette } from '@/theme';
import { Btn, Chip, Field, T } from './ui';

/** Name, bank or e-wallet, and account (or mobile) number. Saves the person and hands them back. */
export function RecipientForm({ submitLabel, onSaved }: { submitLabel: string; onSaved: (r: Recipient) => void }) {
  const pal = usePalette();
  const [name, setName] = useState('');
  const [bank, setBank] = useState<string | null>(null);
  const [number, setNumber] = useState('');
  const [error, setError] = useState<{ field: 'name' | 'bank' | 'number'; text: string } | null>(null);
  const wallet = !!BANKS.find(b => b.id === bank)?.wallet;

  const save = () => {
    if (!name.trim()) return setError({ field: 'name', text: 'Add their name' });
    if (!bank) return setError({ field: 'bank', text: 'Choose their bank or e-wallet' });
    const r = addRecipient({ name, bank, number });
    if (!r.ok) return setError({ field: 'number', text: r.error });
    onSaved(r.value);
  };

  return (
    <View style={{ gap: S.xl }}>
      <Field label="Their name" value={name} onChangeText={t => { setName(t); setError(null); }} placeholder="As it appears on their account"
        autoCapitalize="words" autoCorrect={false} error={error?.field === 'name' ? error.text : null} />
      <View style={{ gap: S.sm }}>
        <T v="label">Bank or e-wallet</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }} accessibilityRole="radiogroup">
          {BANKS.map(b => <Chip key={b.id} label={b.name} selected={bank === b.id} onPress={() => { setBank(b.id); setError(null); }} />)}
        </View>
        {error?.field === 'bank' ? <T v="small" color={pal.danger}>{error.text}</T> : null}
      </View>
      {bank ? (
        <Field label={wallet ? 'Mobile number' : 'Account number'} value={number} onChangeText={t => { setNumber(t); setError(null); }}
          placeholder={wallet ? '09XX XXX XXXX' : '10 to 16 digits'} keyboardType="number-pad" maxLength={20} autoCorrect={false}
          error={error?.field === 'number' ? error.text : null} hint={wallet ? 'The number their e-wallet is registered to.' : undefined}
          returnKeyType="done" onSubmitEditing={save} />
      ) : null}
      <Btn title={submitLabel} onPress={save} />
    </View>
  );
}
