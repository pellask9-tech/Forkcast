/**
 * Web version of src/lib/supabase.ts. Browsers already have localStorage, so the web build skips
 * expo-sqlite (which would need extra WebAssembly setup). Server rendering has no window, so no session.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { COACHING, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/config';

export const supabase: SupabaseClient | null = COACHING
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: typeof window === 'undefined' ? undefined : window.localStorage,
        autoRefreshToken: typeof window !== 'undefined',
        persistSession: typeof window !== 'undefined',
        detectSessionInUrl: false,
      },
    })
  : null;
