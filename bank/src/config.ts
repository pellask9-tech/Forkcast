/**
 * Bank-wide settings for Florin.
 *
 * BANK_NAME, CURRENCY: rebrand the demo here. Amounts are stored as whole centavos (1/100 of the
 *                      currency), so changing the symbol never changes a balance.
 * Limits and fees:     enforced every time money moves. Fees are 0 by default; set one and the review
 *                      screen shows it and the app charges it as its own "Transfer fee" entry.
 *
 * Banks, billers and the demo's merchants are in src/lib/catalog.ts.
 */
export const BANK_NAME = 'Florin';
export const CURRENCY = { code: 'PHP', symbol: '₱' } as const;

/** InstaPay is instant but capped per transfer; PESONet has no cap and arrives the next banking day. */
export const INSTANT_LIMIT = 50_000_00;
/** Everything sent to other people and billers in one calendar day. */
export const DAILY_TRANSFER_LIMIT = 200_000_00;
export const FEES = { instapay: 0, pesonet: 0 } as const;

export const PIN_LENGTH = 6;
/** Wrong PINs allowed before the app makes you wait. Each lockout after that doubles, up to 15 minutes. */
export const PIN_TRIES = 5;

export const MAX_GOALS = 8;
/** Yearly interest on the savings account, paid on the first of each month. */
export const SAVINGS_RATE = 3.25;
