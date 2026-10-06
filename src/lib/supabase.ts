/**
 * Supabase client for coaching. null when coaching isn't configured (see src/config.ts).
 * Setup follows https://docs.expo.dev/guides/using-supabase/ — expo-sqlite's localStorage keeps
 * people signed in between launches.
 */
import 'expo-sqlite/localStorage/install';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { COACHING } from '@/config';

export const supabase: SupabaseClient | null = COACHING
  ? createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    })
  : null;

if (supabase) {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
