import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Meter } from '@/components/Charts';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Group, ICON_INSET, IconWell, Row, SectionHeader, T, tap } from '@/components/ui';
import { DAILY_TRANSFER_LIMIT, INSTANT_LIMIT } from '@/config';
import { bankName, biller, BILLER_GROUPS, masked } from '@/lib/catalog';
import { useNow } from '@/lib/clock';
import { sentToday } from '@/lib/ledger';
import { money } from '@/lib/money';
import { removeBiller, removeRecipient, useBank } from '@/lib/store';
import { R, S, usePalette } from '@/theme';

export default function Pay() {
  const router = useRouter();
  const pal = usePalette();
  const { books } = useBank();
  const now = useNow();
  if (!books) return null;
  const used = sentToday(books, now);

  const forget = (title: string, onConfirm: () => void) => Alert.alert(title, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: onConfirm },
  ]);

  return (
    <Screen tab>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
        <Tile icon="send" title="Send money" sub="To any bank or e-wallet" onPress={() => router.push('/send')} />
        <Tile icon="bills" title="Pay bills" sub="Power, water, internet…" onPress={() => router.push('/bill')} />
        <Tile icon="move" title="Move money" sub="Between your accounts" onPress={() => router.push('/move')} />
        <Tile icon="receive" title="Receive" sub="Your account details" onPress={() => router.push('/add-money')} />
      </View>

      <View>
        <SectionHeader title="People" action="Add" onAction={() => router.push('/recipient')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.lg }}>
          {books.recipients.map(r => (
            <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Send to ${r.name}, ${bankName(r.bank)}`} accessibilityHint="Long press to remove"
              onPress={() => { tap(); router.push({ pathname: '/send', params: { to: r.id } }); }}
              onLongPress={() => forget(`Remove ${r.name}?`, () => removeRecipient(r.id))}
              style={({ pressed }) => ({ width: 72, alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}>
              <Avatar name={r.name} size={56} />
              <T v="small" numberOfLines={1} style={{ fontWeight: '600' }}>{r.name.split(' ')[0]}</T>
              <T v="caption" color={pal.muted} numberOfLines={1}>{bankName(r.bank)}</T>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel="Add someone new" onPress={() => { tap(); router.push('/recipient'); }}
            style={({ pressed }) => ({ width: 72, alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: pal.line, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="add" size={22} color={pal.muted} />
            </View>
            <T v="small" color={pal.muted} style={{ fontWeight: '600' }}>New</T>
          </Pressable>
        </ScrollView>
      </View>

      {books.billers.length ? (
        <View>
          <SectionHeader title="Saved billers" />
          <Group inset={ICON_INSET}>
            {books.billers.map(sb => {
              const b = biller(sb.biller);
              if (!b) return null;
              return (
                <Row key={sb.id} title={b.name} sub={masked(sb.ref)} chevron accessibilityHint="Long press to remove"
                  leading={<IconWell icon={BILLER_GROUPS.find(g => g.id === b.group)?.icon ?? 'bills'} />}
                  onPress={() => router.push({ pathname: '/bill', params: { biller: b.id, ref: sb.ref } })}
                  onLongPress={() => forget(`Remove ${b.name} ${masked(sb.ref)}?`, () => removeBiller(sb.id))} />
              );
            })}
          </Group>
        </View>
      ) : null}

      <View>
        <SectionHeader title="Limits" />
        <View style={{ backgroundColor: pal.surface, borderRadius: R.md, borderCurve: 'continuous', padding: S.lg, gap: S.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.md }}>
            <T v="label">Sent today</T>
            <T v="sub" tabular>{money(used, { whole: true })} of {money(DAILY_TRANSFER_LIMIT, { whole: true })}</T>
          </View>
          <Meter value={used} max={DAILY_TRANSFER_LIMIT} />
          <T v="small" color={pal.muted}>
            InstaPay sends up to {money(INSTANT_LIMIT, { whole: true })} at a time and arrives in seconds. PESONet has no per-transfer cap and arrives the next banking day.
          </T>
        </View>
      </View>
    </Screen>
  );
}

function Tile({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  const pal = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({ flexGrow: 1, flexBasis: '45%', backgroundColor: pressed ? pal.sunken : pal.surface, borderRadius: R.md, borderCurve: 'continuous', padding: S.lg, gap: S.md })}>
      <IconWell icon={icon} size={40} />
      <View style={{ gap: 2 }}>
        <T v="label">{title}</T>
        <T v="small" color={pal.muted} numberOfLines={2}>{sub}</T>
      </View>
    </Pressable>
  );
}
