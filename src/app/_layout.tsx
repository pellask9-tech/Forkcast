import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { usePalette } from '@/components/theme';
import { StoreProvider, useStore } from '@/state/store';

export default function RootLayout() {
  return (
    <StoreProvider>
      <RootNavigator />
    </StoreProvider>
  );
}

function RootNavigator() {
  const { state } = useStore();
  const scheme = useColorScheme();
  const c = usePalette();

  if (!state.hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: c.primary, background: c.background, card: c.card, text: c.text, border: c.border },
  };
  const hasProfile = state.profile !== null;

  return (
    <ThemeProvider value={theme}>
      <Stack>
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="food/[id]" options={{ presentation: 'modal', title: 'Add food' }} />
          <Stack.Screen name="edit-profile" options={{ presentation: 'modal', title: 'Edit profile' }} />
        </Stack.Protected>
        <Stack.Protected guard={!hasProfile}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
