import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetTitle } from '@/components/Header';
import { Btn, Chip, DetailLine, IconBtn, Notice, SectionHeader, T } from '@/components/ui';
import { BANK_NAME } from '@/config';
import { spaced } from '@/lib/catalog';
import { balanceOf, everyday } from '@/lib/ledger';
import { money } from '@/lib/money';
import { addMoney, readBank, useBank } from '@/lib/store';
import { R, S, usePalette } from '@/theme';

const TOP_UPS = [1_000_00, 5_000_00, 10_000_00, 20_000_00];

/** How to pay money in (your account details), plus an instant demo top-up for trying the app. */
export default function AddMoney() {
  const router = useRouter();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ to?: string }>();
  const { books } = useBank();
  const [to, setTo] = useState(params.to && books?.accounts.some(a => a.id === params.to) ? params.to : books ? everyday(books).id : '');
  const [amount, setAmount] = useState(TOP_UPS[1]);
  const [note, setNote] = useState<string | null>(null);
  if (!books) return null;
  const account = books.accounts.find(a => a.id === to) ?? everyday(books);
  const details = `${books.owner.name}\n${BANK_NAME} (demo) · ${account.name}\nAccount number ${spaced(account.number)}`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pal.paper }} contentContainerStyle={{ padding: S.xl, paddingBottom: insets.bottom + S.xl, gap: S.xl, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <SheetTitle title="Add money" onDone={() => router.back()} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        {books.accounts.map(a => <Chip key={a.id} label={a.name} selected={a.id === account.id} onPress={() => { setTo(a.id); setNote(null); }} />)}
      </View>

      <View>
        <SectionHeader title="From another bank or e-wallet" />
        <View style={{ backgroundColor: pal.surface, borderRadius: R.md, borderCurve: 'continuous', padding: S.lg, gap: S.sm }}>
          <T v="small" color={pal.muted}>Send money to these details with InstaPay or PESONet from any bank or e-wallet.</T>
          <DetailLine label="Account name" value={books.owner.name} selectable />
          <DetailLine label="Bank" value={`${BANK_NAME} (demo)`} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md }}>
            <T v="sub" color={pal.muted}>Account number</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.xs }}>
              <T v="h3" tabular selectable>{spaced(account.number)}</T>
              <IconBtn icon="copy" label="Copy account number" size={34} tone="clear"
                onPress={async () => { await Clipboard.setStringAsync(account.number); setNote('Account number copied'); }} />
            </View>
          </View>
          <Btn title="Share details" icon="share" kind="secondary" size="sm" style={{ alignSelf: 'flex-start', marginTop: S.xs }}
            onPress={() => Share.share({ message: details }).catch(async () => { await Clipboard.setStringAsync(details); setNote('Details copied'); })} />
        </View>
      </View>

      <View>
        <SectionHeader title="Demo top-up" />
        <View style={{ backgroundColor: pal.surface, borderRadius: R.md, borderCurve: 'continuous', padding: S.lg, gap: S.md }}>
          <T v="small" color={pal.muted}>Add test money instantly so you can try sending and paying. It isn’t real.</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {TOP_UPS.map(v => <Chip key={v} label={money(v, { whole: true })} selected={amount === v} onPress={() => setAmount(v)} />)}
          </View>
          <Btn title={`Add ${money(amount, { whole: true })} to ${account.name}`} icon="add" onPress={() => {
            const r = addMoney(account.id, amount);
            const latest = readBank().books;
            setNote(r.ok && latest ? `Added. ${account.name} now has ${money(balanceOf(latest, account.id))}.` : r.ok ? 'Added.' : r.error);
          }} />
        </View>
      </View>
      {note ? <Notice text={note} icon="checkCircle" /> : null}
    </ScrollView>
  );
}
