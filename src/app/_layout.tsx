import {
  Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold, Archivo_900Black, useFonts,
} from '@expo-google-fonts/archivo';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { COACHING } from '@/config';
import { initCoaching } from '@/lib/coaching';
import { hydrate, useAppState } from '@/lib/store';
import { useIsDark, usePalette } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold, Archivo_900Black,
  });
  const { ready } = useAppState();
  const pal = usePalette();
  const dark = useIsDark();

  useEffect(() => { hydrate(); }, []);
  // After the local data loads, restore the coaching session (it may switch on the coach's Pro perk).
  useEffect(() => { if (ready && COACHING) initCoaching(); }, [ready]);
  const loaded = (fontsLoaded || !!fontError) && ready;
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, background: pal.paper, card: pal.paper, text: pal.ink, border: pal.line, primary: pal.ink },
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: pal.paper } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="body-check" options={{ presentation: 'modal' }} />
        <Stack.Screen name="program" options={{ presentation: 'modal' }} />
        <Stack.Screen name="levels" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account" options={{ presentation: 'modal' }} />
        <Stack.Screen name="coach-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="coaches/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="client/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
