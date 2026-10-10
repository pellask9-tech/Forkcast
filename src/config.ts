/**
 * Feature switches for Forkcast.
 *
 * AI_FEATURES: meal photo scanning and body check. These need the scan server online
 *              (eas deploy) and an Anthropic API key (or SCAN_DEMO=1). Off = the app works
 *              fully on the phone with no server at all.
 * PAYWALL:     Pro plans and the free-scan / body-check limits. Off = no prices or Pro
 *              screens anywhere, and no limits.
 *
 * COACHING:    coach profiles, coach directory and coach-client links, on Forkcast's Supabase project.
 *              EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (in .env.local or EAS)
 *              point the app at a different project (see README, "Coaching"). Setting both to empty
 *              turns coaching off: no Coach tab and no accounts; the app stays fully on the phone.
 *
 * For the beta, AI_FEATURES and PAYWALL are off. Change them to true when you're ready, then rebuild.
 */
export const AI_FEATURES = false;
export const PAYWALL = false;

// The publishable key is public by design: it ships inside every copy of the app, and the rules in
// supabase/schema.sql decide what each signed-in person can read or change. Never put the database
// password or a secret / service_role key here.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://cmrsgotcnrutbbhyblny.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_BUhXBzwYEcjCELsagSp6jQ_slesVvzu';
export const COACHING = !!(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
