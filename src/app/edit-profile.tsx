import { router } from 'expo-router';

import { ProfileForm } from '@/components/ProfileForm';
import { Screen } from '@/components/ui';
import { useProfile, useStore } from '@/state/store';

export default function EditProfile() {
  const { dispatch } = useStore();
  const profile = useProfile();
  return (
    <Screen>
      <ProfileForm
        initial={profile}
        submitLabel="Save changes"
        onSubmit={(next) => {
          dispatch({ type: 'setProfile', profile: next });
          router.back();
        }}
      />
    </Screen>
  );
}
