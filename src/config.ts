/**
 * Feature switches for Forkcast.
 *
 * AI_FEATURES: meal photo scanning and body check. These need the scan server online
 *              (eas deploy) and an Anthropic API key (or SCAN_DEMO=1). Off = the app works
 *              fully on the phone with no server at all.
 * PAYWALL:     Pro plans and the free-scan / body-check limits. Off = no prices or Pro
 *              screens anywhere, and no limits.
 *
 * COACHING:    coach profiles, coach directory and coach-client links. Turns on by itself once
 *              EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set (see README,
 *              "Coaching"). Off = no Coach tab and no accounts; the app stays fully on the phone.
 *
 * For the beta, AI_FEATURES and PAYWALL are off. Change them to true when you're ready, then rebuild.
 */
export const AI_FEATURES = false;
export const PAYWALL = false;
export const COACHING = !!(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
