import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileForm } from '@/components/ProfileForm';
import { usePalette } from '@/components/theme';
import { Screen, T } from '@/components/ui';
import { useStore } from '@/state/store';

export default function Onboarding() {
  const { dispatch } = useStore();
  const c = usePalette();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <Screen>
        <View style={{ gap: 6, paddingTop: 8 }}>
          <T variant="small" color={c.primary} style={{ fontWeight: '700', letterSpacing: 1 }}>
            FORKCAST
          </T>
          <T variant="title">Let’s set up your plan</T>
          <T variant="muted">
            We’ll work out your BMI, daily calories, macros and micronutrients, then recommend meals that fit
            whether you’re cutting or bulking.
          </T>
        </View>
        {/* Saving the profile flips the route guard in the root layout, which moves on to the tabs. */}
        <ProfileForm submitLabel="Create my plan" onSubmit={(profile) => dispatch({ type: 'setProfile', profile })} />
      </Screen>
    </SafeAreaView>
  );
}
