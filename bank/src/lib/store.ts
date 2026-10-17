/**
 * App state, saved on the device. Screens read it with useBank() and change it with the actions below.
 * Each action runs one pure function from ledger.ts and saves the result, so the rules live in one place.
 * The PIN is never stored here: it's hashed into the device's secure storage by security.ts.
 */
import 'expo-sqlite/localStorage/install';
import { useSyncExternalStore } from 'react';

import { clearPin } from './security';
import * as L from './ledger';
import { demoBooks } from './seed';
import type { CategoryId } from './catalog';
import type { Cents } from './money';

export interface Prefs {
  hideBalances: boolean;
  biometrics: boolean;
  /** Seconds in the background before the app asks for the PIN again. 0 = straight away. */
  lockAfter: number;
}
export const DEFAULT_PREFS: Prefs = { hideBalances: false, biometrics: false, lockAfter: 60 };

export interface BankState {
  ready: boolean;
  /** null until the customer opens an account (or after a reset). */
  books: L.Books | null;
  prefs: Prefs;
}

const BOOKS_KEY = 'florin:v1:books';
const PREFS_KEY = 'florin:v1:prefs';

let state: BankState = { ready: false, books: null, prefs: DEFAULT_PREFS };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getState = () => state;
function set(patch: Partial<BankState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}
export function useBank(): BankState {
  return useSyncExternalStore(subscribe, getState, getState);
}
export const readBank = getState;

/* ---------------- Persistence ---------------- */
function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: keep working in memory for this session.
  }
}
function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
const looksLikeBooks = (b: any): b is L.Books =>
  !!b && Array.isArray(b.accounts) && b.accounts.length > 0 && Array.isArray(b.txns) && Array.isArray(b.goals) && Array.isArray(b.cards);

/** Loads saved state, then clears anything pending whose time has come and pays any interest owed. */
export function hydrate(now = Date.now()) {
  const saved = load<L.Books>(BOOKS_KEY);
  const books = looksLikeBooks(saved) ? catchUp(saved, now) : null;
  set({ ready: true, books, prefs: { ...DEFAULT_PREFS, ...load<Partial<Prefs>>(PREFS_KEY) } });
  if (books !== saved) save(BOOKS_KEY, books);
}

const catchUp = (b: L.Books, now: number) => L.compact(L.payInterest(L.settle(b, now), now), now);

/** Called when the app comes back to the foreground. */
export function refresh(now = Date.now()) {
  if (state.books) setBooks(catchUp(state.books, now));
}

function setBooks(books: L.Books | null) {
  if (books === state.books) return;
  set({ books });
  save(BOOKS_KEY, books);
}
function books() {
  if (!state.books) throw new Error('No account yet');
  return state.books;
}

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };
function apply<T>(r: L.Result<T>): Outcome<T> {
  if (!r.ok) return r;
  setBooks(r.books);
  return { ok: true, value: r.value };
}

/* ---------------- Account ---------------- */
export function openAccount(name: string) {
  setBooks(demoBooks(name.trim().replace(/\s+/g, ' '), Date.now()));
}

/** Wipes everything, including the PIN, and goes back to the welcome screen. */
export async function resetAll() {
  await clearPin();
  set({ books: null, prefs: DEFAULT_PREFS });
  save(BOOKS_KEY, null);
  save(PREFS_KEY, null);
}

export function setPrefs(patch: Partial<Prefs>) {
  set({ prefs: { ...state.prefs, ...patch } });
  save(PREFS_KEY, state.prefs);
}

/* ---------------- Moving money ---------------- */
export const send = (input: L.SendInput) => apply(L.sendMoney(books(), input, Date.now()));
export const payBill = (input: L.BillInput) => apply(L.payBill(books(), input, Date.now()));
export const move = (input: L.MoveInput) => apply(L.moveMoney(books(), input, Date.now()));

/** Demo only: money appears as if sent from your account at another bank. */
export const addMoney = (to: string, amount: Cents) =>
  apply(L.deposit(books(), { to, amount, title: 'Cash in', note: 'Added with the demo top-up' }, Date.now()));

/** Demo only: a friend from your recipients pays you back. */
export function simulateIncoming(): Outcome<L.Txn> {
  const b = books();
  const friend = b.recipients[Math.floor(Math.random() * b.recipients.length)];
  const amount = (2 + Math.floor(Math.random() * 30)) * 50_00;
  return apply(L.deposit(b, {
    to: L.everyday(b).id, amount, title: friend?.name ?? 'A friend', kind: 'transfer', note: 'Paying you back',
    party: friend ? { name: friend.name, bank: friend.bank, number: friend.number } : undefined,
  }, Date.now()));
}

const TEST_SHOPS: Record<'online' | 'store', { merchant: string; category: CategoryId; min: number; max: number }[]> = {
  online: [
    { merchant: 'Shopee', category: 'shopping', min: 199, max: 2400 },
    { merchant: 'Lazada', category: 'shopping', min: 249, max: 2800 },
    { merchant: 'GrabFood', category: 'dining', min: 280, max: 900 },
    { merchant: 'Steam', category: 'entertainment', min: 300, max: 1500 },
  ],
  store: [
    { merchant: 'Jollibee', category: 'dining', min: 160, max: 520 },
    { merchant: 'Starbucks', category: 'dining', min: 165, max: 420 },
    { merchant: 'SM Supermarket', category: 'groceries', min: 900, max: 3800 },
    { merchant: 'Mercury Drug', category: 'health', min: 150, max: 900 },
  ],
};

/** Demo only: a card payment at a random shop, online for the virtual card and tap-to-pay for the debit card. */
export function testCardPayment(cardId: string): Outcome<L.Txn> {
  const b = books();
  const card = b.cards.find(c => c.id === cardId);
  if (!card) return { ok: false, error: 'Card not found' };
  const online = card.kind === 'virtual';
  const shops = TEST_SHOPS[online ? 'online' : 'store'];
  const shop = shops[Math.floor(Math.random() * shops.length)];
  const amount = Math.round(shop.min + Math.random() * (shop.max - shop.min)) * 100;
  return apply(L.cardPayment(b, { card: cardId, merchant: shop.merchant, amount, category: shop.category, online }, Date.now()));
}

/* ---------------- Goals ---------------- */
export const createGoal = (input: L.GoalInput) => apply(L.createGoal(books(), input, Date.now()));
export const updateGoal = (id: string, input: L.GoalInput) => apply(L.updateGoal(books(), id, input));
export const closeGoal = (id: string) => apply(L.closeGoal(books(), id, Date.now()));

/* ---------------- People, billers, budgets, entries, cards ---------------- */
export const addRecipient = (input: { name: string; bank: string; number: string }) => apply(L.addRecipient(books(), input, Date.now()));
export const removeRecipient = (id: string) => setBooks(L.removeRecipient(books(), id));
export const saveBiller = (billerId: string, ref: string) => setBooks(L.saveBiller(books(), billerId, ref));
export const removeBiller = (id: string) => setBooks(L.removeBiller(books(), id));
export const setBudget = (cat: CategoryId, amount: Cents | null) => setBooks(L.setBudget(books(), cat, amount));
export const editTxn = (id: string, patch: { category?: CategoryId; note?: string }) => setBooks(L.editTxn(books(), id, patch));
export const updateCard = (id: string, patch: Parameters<typeof L.updateCard>[2]) => setBooks(L.updateCard(books(), id, patch));
export const replaceCard = (id: string) => setBooks(L.replaceCard(books(), id, Date.now()));
