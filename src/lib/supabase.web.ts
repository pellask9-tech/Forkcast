/**
 * Web version of src/lib/supabase.ts. Browsers already have localStorage, so the web build skips
 * expo-sqlite (which would need extra WebAssembly setup). Server rendering has no window, so no session.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { COACHING } from '@/config';

export const supabase: SupabaseClient | null = COACHING
  ? createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: {
        storage: typeof window === 'undefined' ? undefined : window.localStorage,
        autoRefreshToken: typeof window !== 'undefined',
        persistSession: typeof window !== 'undefined',
        detectSessionInUrl: false,
      },
    })
  : null;
