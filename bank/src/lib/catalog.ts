/**
 * Philippine banks, billers and spending categories used by Florin.
 * To move the demo to another country, swap these lists and CURRENCY in src/config.ts.
 */
import type { IconName } from '@/components/Icon';

export type CategoryId =
  | 'bills' | 'groceries' | 'dining' | 'transport' | 'shopping' | 'health' | 'entertainment' | 'travel'
  | 'transfers' | 'cash' | 'fees' | 'other' | 'income' | 'savings';

/** `spend: false` categories (money in, and moves between your own accounts) never count as spending. */
export const CATEGORIES: { id: CategoryId; label: string; icon: IconName; spend: boolean }[] = [
  { id: 'bills', label: 'Bills & rent', icon: 'bolt', spend: true },
  { id: 'groceries', label: 'Groceries', icon: 'cart', spend: true },
  { id: 'dining', label: 'Food & drink', icon: 'dining', spend: true },
  { id: 'transport', label: 'Transport', icon: 'car', spend: true },
  { id: 'shopping', label: 'Shopping', icon: 'bag', spend: true },
  { id: 'health', label: 'Health', icon: 'health', spend: true },
  { id: 'entertainment', label: 'Entertainment', icon: 'tv', spend: true },
  { id: 'travel', label: 'Travel', icon: 'plane', spend: true },
  { id: 'transfers', label: 'Transfers', icon: 'people', spend: true },
  { id: 'cash', label: 'Cash', icon: 'cash', spend: true },
  { id: 'fees', label: 'Fees', icon: 'percent', spend: true },
  { id: 'other', label: 'Other', icon: 'more', spend: true },
  { id: 'income', label: 'Income', icon: 'downLeft', spend: false },
  { id: 'savings', label: 'Savings', icon: 'savings', spend: false },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c])) as Record<CategoryId, (typeof CATEGORIES)[number]>;
export const category = (id: CategoryId) => CAT[id] ?? CAT.other;
export const SPEND_CATEGORIES = CATEGORIES.filter(c => c.spend);

/* ---------------- Banks and e-wallets (InstaPay / PESONet) ---------------- */
export interface Bank {
  id: string;
  name: string;
  /** Wallets take the owner's 11-digit mobile number instead of an account number. */
  wallet?: boolean;
}
export const BANKS: Bank[] = [
  { id: 'bdo', name: 'BDO Unibank' },
  { id: 'bpi', name: 'BPI' },
  { id: 'metrobank', name: 'Metrobank' },
  { id: 'landbank', name: 'Landbank' },
  { id: 'pnb', name: 'PNB' },
  { id: 'securitybank', name: 'Security Bank' },
  { id: 'unionbank', name: 'UnionBank' },
  { id: 'rcbc', name: 'RCBC' },
  { id: 'chinabank', name: 'China Bank' },
  { id: 'eastwest', name: 'EastWest Bank' },
  { id: 'gotyme', name: 'GoTyme Bank' },
  { id: 'gcash', name: 'GCash', wallet: true },
  { id: 'maya', name: 'Maya', wallet: true },
];
export const bankName = (id?: string) => BANKS.find(b => b.id === id)?.name ?? id ?? '';

/** Returns a problem with an account number, or null if it looks right. Digits only; spaces are ignored. */
export function checkAccountNumber(bankId: string, input: string): string | null {
  const n = input.replace(/\s/g, '');
  const bank = BANKS.find(b => b.id === bankId);
  if (!bank) return 'Choose a bank';
  if (!/^\d+$/.test(n)) return 'Use numbers only';
  if (bank.wallet) return /^09\d{9}$/.test(n) ? null : 'Enter the 11-digit mobile number, starting with 09';
  return n.length >= 10 && n.length <= 16 ? null : 'Account numbers have 10 to 16 digits';
}

/** "0917 123 4567" style spacing for display: groups of four from the left. */
export const spaced = (n: string) => n.replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
/** Last four digits, "•••• 4821". */
export const masked = (n: string) => `•••• ${n.replace(/\s/g, '').slice(-4)}`;

/* ---------------- Billers ---------------- */
export type BillerGroupId = 'electricity' | 'water' | 'internet' | 'mobile' | 'cards' | 'government' | 'insurance';
export const BILLER_GROUPS: { id: BillerGroupId; label: string; icon: IconName }[] = [
  { id: 'electricity', label: 'Electricity', icon: 'bolt' },
  { id: 'water', label: 'Water', icon: 'water' },
  { id: 'internet', label: 'Internet & cable', icon: 'wifi' },
  { id: 'mobile', label: 'Mobile postpaid', icon: 'phone' },
  { id: 'cards', label: 'Credit cards', icon: 'cards' },
  { id: 'government', label: 'Government', icon: 'bank' },
  { id: 'insurance', label: 'Insurance', icon: 'shield' },
];

export interface Biller {
  id: string;
  name: string;
  group: BillerGroupId;
  /** What the biller calls your reference, and how it's checked. */
  refLabel: string;
  ref: 'account' | 'card' | 'mobile';
}
export const BILLERS: Biller[] = [
  { id: 'meralco', name: 'Meralco', group: 'electricity', refLabel: 'Customer account number', ref: 'account' },
  { id: 'veco', name: 'Visayan Electric', group: 'electricity', refLabel: 'Account number', ref: 'account' },
  { id: 'davaolight', name: 'Davao Light', group: 'electricity', refLabel: 'Account number', ref: 'account' },
  { id: 'maynilad', name: 'Maynilad', group: 'water', refLabel: 'Contract account number', ref: 'account' },
  { id: 'manilawater', name: 'Manila Water', group: 'water', refLabel: 'Contract account number', ref: 'account' },
  { id: 'pldt', name: 'PLDT Home', group: 'internet', refLabel: 'Account number', ref: 'account' },
  { id: 'converge', name: 'Converge', group: 'internet', refLabel: 'Account number', ref: 'account' },
  { id: 'globeathome', name: 'Globe At Home', group: 'internet', refLabel: 'Account number', ref: 'account' },
  { id: 'globe', name: 'Globe Postpaid', group: 'mobile', refLabel: 'Mobile number', ref: 'mobile' },
  { id: 'smart', name: 'Smart Postpaid', group: 'mobile', refLabel: 'Mobile number', ref: 'mobile' },
  { id: 'bdocc', name: 'BDO Credit Card', group: 'cards', refLabel: 'Card number', ref: 'card' },
  { id: 'bpicc', name: 'BPI Credit Card', group: 'cards', refLabel: 'Card number', ref: 'card' },
  { id: 'sss', name: 'SSS', group: 'government', refLabel: 'Payment reference number', ref: 'account' },
  { id: 'philhealth', name: 'PhilHealth', group: 'government', refLabel: 'PhilHealth number', ref: 'account' },
  { id: 'pagibig', name: 'Pag-IBIG Fund', group: 'government', refLabel: 'Pag-IBIG MID number', ref: 'account' },
  { id: 'sunlife', name: 'Sun Life', group: 'insurance', refLabel: 'Policy number', ref: 'account' },
];
export const biller = (id: string) => BILLERS.find(b => b.id === id);

export function checkBillRef(b: Biller, input: string): string | null {
  const n = input.replace(/\s/g, '');
  if (!/^\d+$/.test(n)) return 'Use numbers only';
  if (b.ref === 'mobile') return /^09\d{9}$/.test(n) ? null : 'Enter the 11-digit mobile number, starting with 09';
  if (b.ref === 'card') return n.length === 16 ? null : 'Card numbers have 16 digits';
  return n.length >= 6 && n.length <= 16 ? null : 'Enter 6 to 16 digits';
}
