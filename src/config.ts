/**
 * Feature switches for Forkcast.
 *
 * AI_FEATURES: meal photo scanning and body check. These need the scan server online
 *              (eas deploy) and an Anthropic API key (or SCAN_DEMO=1). Off = the app works
 *              fully on the phone with no server at all.
 * PAYWALL:     Pro plans and the free-scan / body-check limits. Off = no prices or Pro
 *              screens anywhere, and no limits.
 *
 * For the beta, both are off. Change to true when you're ready, then rebuild.
 */
export const AI_FEATURES = false;
export const PAYWALL = false;
