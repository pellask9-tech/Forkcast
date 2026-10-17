import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNow } from '@/lib/clock';
import { firstName } from '@/lib/ledger';
import { biometricLabel, biometricType, checkPin, confirmWithBiometrics, lockedUntil, type Biometric } from '@/lib/security';
import { unlock } from '@/lib/session';
import { readBank, resetAll, useBank } from '@/lib/store';
import { S, usePalette } from '@/theme';
import { Guilloche, Logo } from './Brand';
import { PinPad } from './Keypad';
import { Btn, T } from './ui';

/** "0:27" until a PIN lockout ends. */
function useCountdown(until: number) {
  const now = useNow(1000);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  return { left, label: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` };
}

/** Checks a PIN and turns the result into what to show: null when right, otherwise the reason. */
async function verify(pin: string, setUntil: (n: number) => void) {
  const r = await checkPin(pin);
  if (r.ok) return null;
  if (r.waitUntil) { setUntil(r.waitUntil); return 'Too many wrong PINs.'; }
  return r.triesLeft === 1 ? 'Wrong PIN. 1 try left before a short wait.' : `Wrong PIN. ${r.triesLeft} tries left.`;
}

/** Biometric unlock, if the person turned it on and the phone supports it. */
function useBiometric(enabled: boolean) {
  const [kind, setKind] = useState<Biometric | null>(null);
  useEffect(() => { if (enabled) biometricType().then(setKind); }, [enabled]);
  return enabled ? kind : null;
}

/** Covers the whole app until the right PIN (or a face or fingerprint) is given. */
export function LockScreen() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const { books, prefs } = useBank();
  const [until, setUntil] = useState(0);
  const countdown = useCountdown(until);
  const bio = useBiometric(prefs.biometrics);
  const locked = countdown.left > 0;

  useEffect(() => { lockedUntil().then(setUntil); }, []);
  const tryBiometric = async () => { if (await confirmWithBiometrics('Unlock Florin')) unlock(); };
  // Offer the face or fingerprint check straight away, the way banking apps do.
  useEffect(() => { if (bio && !locked) tryBiometric(); }, [bio]); // eslint-disable-line react-hooks/exhaustive-deps

  const forgot = () => Alert.alert(
    'Forgot your PIN?',
    'This demo has no way to recover a PIN. You can reset the app and start over with new demo money.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset app', style: 'destructive', onPress: () => resetAll() }],
  );

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: pal.brand, paddingTop: insets.top + S.xl, paddingBottom: insets.bottom + S.lg, paddingHorizontal: S.xl, justifyContent: 'space-between' }}
      accessibilityViewIsModal>
      <Guilloche color={pal.gold} opacity={0.14} height={insets.top + 260} />
      <View style={{ alignItems: 'center', gap: S.md }}>
        <Logo size={56} />
        <T v="sub" color={pal.brandMuted}>{books ? `Welcome back, ${firstName(books)}` : 'Welcome back'}</T>
      </View>
      <PinPad
        onBrand
        title={locked ? 'Too many wrong PINs' : 'Enter your PIN'}
        sub={locked ? `Try again in ${countdown.label}` : undefined}
        locked={locked}
        left={bio ? { label: `Unlock with ${biometricLabel(bio)}`, icon: bio === 'face' ? 'faceid' : 'fingerprint', onPress: tryBiometric } : null}
        onComplete={async pin => {
          const problem = await verify(pin, setUntil);
          if (!problem) unlock();
          return problem;
        }}
        footer={
          <Pressable accessibilityRole="button" onPress={forgot} hitSlop={10} style={{ alignSelf: 'center', paddingVertical: S.sm }}>
            <T v="label" color={pal.brandMuted}>Forgot PIN?</T>
          </Pressable>
        }
      />
    </View>
  );
}

/** Shown whenever the app isn't in the foreground, so balances never appear in the app switcher. */
export function PrivacyCover() {
  const pal = usePalette();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: pal.brand, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Guilloche color={pal.gold} opacity={0.12} />
      <Logo size={72} />
    </View>
  );
}

/**
 * Asks for the PIN (or biometrics) before something sensitive. Render `sheet` in the screen and await
 * `ask(reason)`: true once confirmed, false if cancelled.
 */
export function usePinCheck() {
  const [request, setRequest] = useState<{ reason: string; resolve: (ok: boolean) => void } | null>(null);
  const ask = (reason: string) => new Promise<boolean>(resolve => setRequest({ reason, resolve }));
  const done = (ok: boolean) => { request?.resolve(ok); setRequest(null); };
  const sheet = <PinSheet reason={request?.reason} onDone={done} />;
  return { ask, sheet };
}

function PinSheet({ reason, onDone }: { reason?: string; onDone: (ok: boolean) => void }) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!reason} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => onDone(false)}>
      <View style={{ flex: 1, backgroundColor: pal.paper, paddingTop: S.lg, paddingBottom: insets.bottom + S.lg, paddingHorizontal: S.xl, gap: S.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Btn title="Cancel" kind="ghost" size="sm" onPress={() => onDone(false)} />
        </View>
        {reason ? <PinConfirm key={reason} reason={reason} onConfirmed={() => onDone(true)} /> : null}
      </View>
    </Modal>
  );
}

/**
 * The PIN pad for approving something, with the same wrong-PIN lockout as the lock screen and the
 * person's biometric unlock (offered straight away when it's turned on).
 */
export function PinConfirm({ reason, onConfirmed, title = 'Enter your PIN' }: { reason: string; onConfirmed: () => void; title?: string }) {
  const [until, setUntil] = useState(0);
  const countdown = useCountdown(until);
  const bio = useBiometric(readBank().prefs.biometrics);
  const tryBiometric = async () => { if (await confirmWithBiometrics(reason)) onConfirmed(); };
  useEffect(() => { if (bio) tryBiometric(); }, [bio]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { lockedUntil().then(setUntil); }, []);
  return (
    <PinPad
      title={countdown.left > 0 ? 'Too many wrong PINs' : title}
      sub={countdown.left > 0 ? `Try again in ${countdown.label}` : reason}
      locked={countdown.left > 0}
      left={bio ? { label: `Use ${biometricLabel(bio)}`, icon: bio === 'face' ? 'faceid' : 'fingerprint', onPress: tryBiometric } : null}
      onComplete={async pin => {
        const problem = await verify(pin, setUntil);
        if (!problem) onConfirmed();
        return problem;
      }}
    />
  );
}
