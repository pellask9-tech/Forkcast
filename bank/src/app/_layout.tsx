import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { LockScreen, PrivacyCover } from '@/components/LockScreen';
import { hasPin } from '@/lib/security';
import { useSession, watchAppState } from '@/lib/session';
import { hydrate, readBank, refresh, resetAll, useBank } from '@/lib/store';
import { useIsDark, usePalette } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { ready, books } = useBank();
  const { locked, covered } = useSession();
  const pal = usePalette();
  const dark = useIsDark();
  const router = useRouter();
  const onboarded = !!books;

  useEffect(() => { if (!ready) hydrate(); }, [ready]);
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  useEffect(() => watchAppState(() => readBank().prefs.lockAfter, () => refresh()), []);
  // Saved data without its PIN (say, restored to a new phone without the keychain) can't be unlocked: start over.
  useEffect(() => { if (ready && onboarded) hasPin().then(has => { if (!has) resetAll(); }); }, [ready, onboarded]);
  // Close any open flow when the app locks, so nothing half-finished sits above the lock screen.
  useEffect(() => { if (locked && onboarded && router.canDismiss()) router.dismissAll(); }, [locked]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: pal.paper, card: pal.paper, text: pal.ink, border: pal.line, primary: pal.ink } };
  const sheet = { presentation: 'formSheet', sheetGrabberVisible: true, headerShown: false, contentStyle: { backgroundColor: pal.paper } } as const;
  const modal = { presentation: 'modal' } as const;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={(onboarded && locked) || dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShadowVisible: false, headerTintColor: pal.ink, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: pal.paper } }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="activity" options={{ title: 'Activity' }} />
          <Stack.Screen name="account/[id]" options={{ title: '' }} />
          <Stack.Screen name="goal/[id]" options={{ title: '' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile' }} />
          <Stack.Screen name="transaction/[id]" options={{ ...sheet, sheetAllowedDetents: [0.8, 1] }} />
          <Stack.Screen name="add-money" options={{ ...sheet, sheetAllowedDetents: [0.75, 1] }} />
          <Stack.Screen name="send" options={{ ...modal, title: 'Send money' }} />
          <Stack.Screen name="bill" options={{ ...modal, title: 'Pay a bill' }} />
          <Stack.Screen name="move" options={{ ...modal, title: 'Move money' }} />
          <Stack.Screen name="recipient" options={{ ...modal, title: 'New recipient' }} />
          <Stack.Screen name="goal-edit" options={{ ...modal, title: 'New goal' }} />
          <Stack.Screen name="budgets" options={{ ...modal, title: 'Monthly budgets' }} />
          <Stack.Screen name="change-pin" options={{ ...modal, title: 'Change PIN' }} />
        </Stack.Protected>
      </Stack>
      {onboarded && locked ? <LockScreen /> : null}
      {covered ? <PrivacyCover /> : null}
    </ThemeProvider>
  );
}
