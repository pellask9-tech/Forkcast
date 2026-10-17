import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Screen } from '@/components/Screen';
import { Badge, Group, ICON_INSET, IconWell, Notice, Row, SectionHeader, Segmented, T } from '@/components/ui';
import { BANK_NAME } from '@/config';
import { monthLabel, monthKey } from '@/lib/dates';
import { money } from '@/lib/money';
import { biometricLabel, biometricType, confirmWithBiometrics, type Biometric } from '@/lib/security';
import { lockNow } from '@/lib/session';
import { resetAll, setPrefs, simulateIncoming, useBank } from '@/lib/store';
import { S, usePalette } from '@/theme';

const LOCK_OPTIONS = [{ value: 0, label: 'Immediately' }, { value: 60, label: 'After 1 min' }, { value: 300, label: 'After 5 min' }];

export default function Profile() {
  const router = useRouter();
  const pal = usePalette();
  const { books, prefs } = useBank();
  const [bio, setBio] = useState<Biometric | null | undefined>(undefined);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { biometricType().then(setBio); }, []);
  if (!books) return null;

  const toggleBiometrics = async (on: boolean) => {
    if (!on) return setPrefs({ biometrics: false });
    if (await confirmWithBiometrics(`Turn on ${biometricLabel(bio ?? null)} for ${BANK_NAME}`)) setPrefs({ biometrics: true });
  };
  const reset = () => Alert.alert(
    'Reset the demo?',
    'This deletes your demo accounts, history and PIN on this phone, and takes you back to the start.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => resetAll() }],
  );
  const getPaid = () => {
    const r = simulateIncoming();
    setNote(r.ok ? `${r.value.title} sent you ${money(r.value.amount)}.` : r.error);
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: S.sm }}>
        <Avatar name={books.owner.name} size={72} />
        <T v="h2" selectable>{books.owner.name}</T>
        <T v="sub" color={pal.muted}>Customer since {monthLabel(monthKey(books.owner.since))}</T>
        <Badge label="Demo account" icon="info" />
      </View>

      <View>
        <SectionHeader title="Security" />
        <Group inset={ICON_INSET}>
          <Row title="Change PIN" leading={<IconWell icon="lock" />} chevron onPress={() => router.push('/change-pin')} />
          {bio ? (
            <Row title={`Unlock with ${biometricLabel(bio)}`} sub="Instead of typing your PIN" leading={<IconWell icon={bio === 'face' ? 'faceid' : 'fingerprint'} />}
              trailing={<Switch value={prefs.biometrics} onValueChange={toggleBiometrics} accessibilityLabel={`Unlock with ${biometricLabel(bio)}`} />} />
          ) : bio === null ? (
            <Row title="Face or fingerprint unlock" leading={<IconWell icon="fingerprint" />}
              sub={process.env.EXPO_OS === 'web' ? 'Not available in a browser' : process.env.EXPO_OS === 'ios' ? 'Needs Face ID or Touch ID set up. Face ID needs the full app build, not Expo Go.' : 'Set up a fingerprint or face unlock in your phone’s settings first'} />
          ) : null}
          <Row title="Lock now" leading={<IconWell icon="logout" />} onPress={lockNow} />
        </Group>
        <View style={{ marginTop: S.md, gap: S.sm }}>
          <T v="label" style={{ paddingHorizontal: S.xs }}>Ask for my PIN when I come back</T>
          <Segmented options={LOCK_OPTIONS} value={prefs.lockAfter} onChange={v => setPrefs({ lockAfter: v })} />
        </View>
      </View>

      <View>
        <SectionHeader title="Privacy" />
        <Group inset={ICON_INSET}>
          <Row title="Hide balances" sub="Show •••••• instead of how much you have" leading={<IconWell icon="eyeOff" />}
            trailing={<Switch value={prefs.hideBalances} onValueChange={v => setPrefs({ hideBalances: v })} accessibilityLabel="Hide balances" />} />
        </Group>
      </View>

      <View>
        <SectionHeader title="Demo tools" />
        <Group inset={ICON_INSET}>
          <Row title="Get paid by a friend" sub="Someone from your people sends you money" leading={<IconWell icon="downLeft" />} onPress={getPaid} />
          <Row title="Try a card payment" sub="On the Cards tab: freeze a card first to see it declined" leading={<IconWell icon="cards" />} chevron onPress={() => router.navigate('/cards')} />
          <Row title="Reset the demo" sub="Start again with new demo money" leading={<IconWell icon="reset" color={pal.danger} />} destructive onPress={reset} />
        </Group>
        {note ? <Notice icon="checkCircle" text={note} style={{ marginTop: S.md }} /> : null}
      </View>

      <T v="small" color={pal.muted} style={{ textAlign: 'center' }}>
        {BANK_NAME} {Constants.expoConfig?.version ?? ''} · A demo banking app. No real money moves, and your data stays on this phone.
      </T>
    </Screen>
  );
}
