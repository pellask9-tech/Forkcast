import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader } from '@/components/Flow';
import { PinPad } from '@/components/Keypad';
import { PinConfirm } from '@/components/LockScreen';
import { Btn, Notice } from '@/components/ui';
import { setPin, weakPin } from '@/lib/security';
import { S, usePalette } from '@/theme';

type Step = 'current' | 'new' | 'confirm' | 'done';

export default function ChangePin() {
  const router = useRouter();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('current');
  const [fresh, setFresh] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const close = () => router.back();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pal.paper }} contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1, padding: S.lg, paddingBottom: S.xxl + (process.env.EXPO_OS === 'ios' ? 0 : insets.bottom), gap: S.xl, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      {step === 'current' ? (
        <>
          <FlowHeader title="Change PIN" cancel={close} />
          <PinConfirm title="Enter your current PIN" reason="Then choose a new one." onConfirmed={() => setStep('new')} />
        </>
      ) : step === 'new' ? (
        <>
          <FlowHeader title="Change PIN" cancel={close} />
          <PinPad key={`new${mismatch}`} title={mismatch ? 'Those didn’t match' : 'Choose a new PIN'} sub={mismatch ? 'Choose your new PIN again.' : 'Six digits, without an easy pattern.'}
            onComplete={pin => {
              if (weakPin(pin)) return 'That PIN is easy to guess. Try one without a pattern.';
              setFresh(pin);
              setMismatch(false);
              setStep('confirm');
              return null;
            }} />
        </>
      ) : step === 'confirm' ? (
        <>
          <FlowHeader title="Change PIN" back={() => setStep('new')} />
          <PinPad key="confirm" title="Enter it again" onComplete={async pin => {
            if (pin !== fresh) { setMismatch(true); setStep('new'); return null; }
            await setPin(pin);
            setStep('done');
            return null;
          }} />
        </>
      ) : (
        <>
          <FlowHeader title="" done={close} />
          <Notice icon="checkCircle" text="Your PIN is changed. Use it next time you open the app or approve a payment." />
          <Btn title="Done" onPress={close} />
        </>
      )}
    </ScrollView>
  );
}

