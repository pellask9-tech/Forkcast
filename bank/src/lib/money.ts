/**
 * Money is always a whole number of centavos (1/100 of the currency) so sums never pick up
 * floating-point errors. Format only at the edge, when showing it.
 */
import { CURRENCY } from '@/config';

export type Cents = number;

/** Typographic minus, so "−₱120.00" lines up with "+₱120.00". */
export const MINUS = '−';
export const MASK = '••••••';

const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export interface MoneyParts {
  sign: '' | '+' | typeof MINUS;
  whole: string;
  frac: string;
}

export function moneyParts(c: Cents, sign: 'auto' | 'always' = 'auto'): MoneyParts {
  const abs = Math.abs(Math.round(c));
  return {
    sign: c < 0 ? MINUS : sign === 'always' && c > 0 ? '+' : '',
    whole: group(Math.floor(abs / 100)),
    frac: String(abs % 100).padStart(2, '0'),
  };
}

/** money(123456) → "₱1,234.56"; money(-500, { sign: 'always' }) → "−₱5.00"; { whole: true } drops centavos. */
export function money(c: Cents, opts: { sign?: 'auto' | 'always'; whole?: boolean } = {}) {
  const p = moneyParts(opts.whole ? Math.round(c / 100) * 100 : c, opts.sign);
  return `${p.sign}${CURRENCY.symbol}${p.whole}${opts.whole ? '' : '.' + p.frac}`;
}

/** Short form for chart axes and tight labels: ₱950, ₱1.2K, ₱48K, ₱1.5M. */
export function compact(c: Cents) {
  const v = Math.abs(c) / 100;
  const sign = c < 0 ? MINUS : '';
  const short = (n: number, unit: string) => `${sign}${CURRENCY.symbol}${n >= 10 ? Math.round(n) : Math.round(n * 10) / 10}${unit}`;
  if (v >= 1_000_000) return short(v / 1_000_000, 'M');
  if (v >= 1_000) return short(v / 1_000, 'K');
  return `${sign}${CURRENCY.symbol}${Math.round(v)}`;
}

/** "1,234.5" or "₱ 1234" → centavos; null if it isn't a plain amount with at most two decimals. */
export function parseAmount(input: string): Cents | null {
  const s = input.replace(/[\s,]/g, '').replace(CURRENCY.symbol, '');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [w, f = ''] = s.split('.');
  return Number(w) * 100 + Number(f.padEnd(2, '0'));
}

export const toCents = (amount: number): Cents => Math.round(amount * 100);

/* ---------------- Keypad entry ---------------- */
/** Up to 9,999,999.99 — enough for any demo transfer, and the display never wraps. */
const MAX_WHOLE_DIGITS = 7;

/** Applies one keypad press ('0'–'9', '.', 'del') to the typed amount string. */
export function typeKey(raw: string, key: string): string {
  if (key === 'del') return raw.slice(0, -1);
  const [w, f] = raw.split('.');
  if (key === '.') return raw.includes('.') ? raw : (raw || '0') + '.';
  if (!/^\d$/.test(key)) return raw;
  if (f !== undefined) return f.length >= 2 ? raw : raw + key;
  if (w === '0') return key;
  return w.length >= MAX_WHOLE_DIGITS ? raw : raw + key;
}

/** "1234.5" → "1,234.5" (keeps what was typed after the point, so the display matches the keys). */
export function formatTyped(raw: string) {
  if (!raw) return '0';
  const [w, f] = raw.split('.');
  return group(Number(w || '0')) + (f !== undefined ? '.' + f : '');
}

export const typedToCents = (raw: string): Cents => parseAmount(raw || '0') ?? 0;
