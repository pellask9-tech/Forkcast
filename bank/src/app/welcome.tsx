import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Guilloche, Logo } from '@/components/Brand';
import { HeaderAction } from '@/components/Header';
import { Icon, type IconName } from '@/components/Icon';
import { PinPad } from '@/components/Keypad';
import { Btn, Field, T } from '@/components/ui';
import { BANK_NAME } from '@/config';
import { biometricLabel, biometricType, confirmWithBiometrics, setPin, weakPin, type Biometric } from '@/lib/security';
import { unlock } from '@/lib/session';
import { openAccount, setPrefs } from '@/lib/store';
import { S, usePalette } from '@/theme';

type Step = 'intro' | 'name' | 'pin' | 'confirm' | 'biometrics';

/** First run: what this is, your name, a PIN (twice), then an optional face or fingerprint unlock. */
export default function Welcome() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('intro');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [firstPin, setFirstPin] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [bio, setBio] = useState<Biometric | null>(null);

  useEffect(() => { biometricType().then(setBio); }, []);

  const finish = () => {
    unlock();
    openAccount(name);
  };
  const next = () => {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length < 2) return setNameError('Enter your name');
    if (clean.length > 40) return setNameError('Keep it under 40 characters');
    setName(clean);
    setStep('pin');
  };

  if (step === 'intro') return <Intro onStart={() => setStep('name')} />;

  const back = { name: 'intro', pin: 'name', confirm: 'pin', biometrics: null }[step] as Step | null;
  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: pal.paper }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + S.sm, paddingBottom: insets.bottom + S.xl, paddingHorizontal: S.xl, gap: S.xl, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        <View style={{ height: 44, justifyContent: 'center', alignItems: 'flex-start' }}>
          {back ? <HeaderAction kind="back" onPress={() => setStep(back)} /> : null}
        </View>

        {step === 'name' ? (
          <View style={{ gap: S.xl }}>
            <View style={{ gap: S.sm }}>
              <T v="title" accessibilityRole="header">What’s your name?</T>
              <T v="sub" color={pal.muted}>It goes on your card and your receipts.</T>
            </View>
            <Field label="Full name" value={name} onChangeText={t => { setName(t); setNameError(null); }} placeholder="Ria Santos"
              autoCapitalize="words" autoComplete="name" textContentType="name" autoFocus returnKeyType="next" error={nameError}
              onSubmitEditing={() => next()} />
            <Btn title="Continue" onPress={() => next()} />
          </View>
        ) : step === 'pin' ? (
          <PinPad key={`pin${mismatch}`} title={mismatch ? 'Those didn’t match' : 'Create a 6-digit PIN'}
            sub={mismatch ? 'Choose your PIN again.' : 'You’ll use it to open Florin and approve payments.'}
            onComplete={pin => {
              if (weakPin(pin)) return 'That PIN is easy to guess. Try one without a pattern.';
              setFirstPin(pin);
              setMismatch(false);
              setStep('confirm');
              return null;
            }} />
        ) : step === 'confirm' ? (
          <PinPad key="confirm" title="Enter it again" sub="Just to make sure."
            onComplete={async pin => {
              if (pin !== firstPin) { setMismatch(true); setStep('pin'); return null; }
              await setPin(pin);
              if (bio) setStep('biometrics'); else finish();
              return null;
            }} />
        ) : (
          <View style={{ gap: S.xl, flex: 1, justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', gap: S.lg }}>
              <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: pal.sunken, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={bio === 'face' ? 'faceid' : 'fingerprint'} size={44} color={pal.ink} />
              </View>
              <T v="title" style={{ textAlign: 'center' }} accessibilityRole="header">Unlock with {biometricLabel(bio)}?</T>
              <T v="sub" color={pal.muted} style={{ textAlign: 'center' }}>Skip typing your PIN to open the app and approve payments. You can change this in Profile.</T>
            </View>
            <View style={{ gap: S.md }}>
              <Btn title={`Use ${biometricLabel(bio)}`} onPress={async () => {
                if (await confirmWithBiometrics(`Turn on ${biometricLabel(bio)} for ${BANK_NAME}`)) setPrefs({ biometrics: true });
                finish();
              }} />
              <Btn title="Not now" kind="ghost" onPress={finish} />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const point = (icon: IconName, title: string, sub: string) => (
    <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={pal.gold} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label" color={pal.brandInk}>{title}</T>
        <T v="small" color={pal.brandMuted}>{sub}</T>
      </View>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: pal.brand }}>
      <Guilloche color={pal.gold} opacity={0.16} height={insets.top + 380} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', gap: S.xxl, paddingTop: insets.top + S.xxl, paddingBottom: insets.bottom + S.xl, paddingHorizontal: S.xl, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        <View style={{ gap: S.lg }}>
          <Logo size={64} />
          <T v="title" color={pal.brandInk} style={{ fontSize: 40, lineHeight: 44, letterSpacing: -1.2 }} accessibilityRole="header">{BANK_NAME}</T>
          <T v="body" color={pal.brandMuted}>Everyday banking, made simple. Send to any bank, freeze a card in a tap and see where your money goes.</T>
        </View>
        <View style={{ gap: S.xl }}>
          {point('send', 'Send to any bank or e-wallet', 'InstaPay arrives in seconds. PESONet for bigger amounts.')}
          {point('freeze', 'Cards you control', 'Freeze, set limits and switch off online or overseas use.')}
          {point('insights', 'See where it goes', 'Spending by category, budgets and savings goals.')}
        </View>
        <View style={{ gap: S.lg }}>
          <View style={{ flexDirection: 'row', gap: S.md, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: S.md + 2 }}>
            <Icon name="info" size={18} color={pal.brandMuted} />
            <T v="small" color={pal.brandMuted} style={{ flex: 1 }}>This is a demo. The money and people are made up, and nothing leaves your phone.</T>
          </View>
          <Btn title="Open a demo account" kind="gold" onPress={onStart} />
        </View>
      </ScrollView>
    </View>
  );
}
