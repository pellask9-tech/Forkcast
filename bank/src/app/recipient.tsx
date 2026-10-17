import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader } from '@/components/Flow';
import { RecipientForm } from '@/components/RecipientForm';
import { S, usePalette } from '@/theme';

export default function NewRecipient() {
  const router = useRouter();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: pal.paper }} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl + (process.env.EXPO_OS === 'ios' ? 0 : insets.bottom), gap: S.lg, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <FlowHeader title="New recipient" cancel={() => router.back()} />
      <RecipientForm submitLabel="Save" onSaved={() => router.back()} />
    </ScrollView>
  );
}
