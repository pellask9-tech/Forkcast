/**
 * The books: accounts, goals and cards, and every movement of money between them.
 *
 * Balances are never stored. Each one is worked out from the holder's opening balance plus its entries,
 * so a balance can't drift from the history that produced it. A move between your own accounts writes two
 * linked entries that share a reference. Every function here is pure: it takes the books and returns new
 * books, or the reason it can't (shown to the user as is).
 */
import { DAILY_TRANSFER_LIMIT, FEES, INSTANT_LIMIT, MAX_GOALS, SAVINGS_RATE } from '@/config';
import { BANKS, category, checkAccountNumber, checkBillRef, type Biller, type CategoryId } from './catalog';
import { addMonths, dayKey, daysInMonth, monthKey, monthStart, nextBankingDay, startOfDay, DAY } from './dates';
import { money, type Cents } from './money';

export type TxnKind = 'card' | 'transfer' | 'bill' | 'deposit' | 'salary' | 'interest' | 'atm' | 'move' | 'fee';
export type TxnStatus = 'done' | 'pending' | 'declined';
export type Method = 'instapay' | 'pesonet';

/** Who you paid or who paid you. For a bill, `number` is your reference with the biller. */
export interface Party { name: string; bank?: string; number?: string }

export interface Txn {
  id: string;
  /** The account or goal the money is in. */
  holder: string;
  /** Centavos. Negative is money out. */
  amount: Cents;
  at: number;
  title: string;
  category: CategoryId;
  kind: TxnKind;
  status: TxnStatus;
  /** Reference number shown on receipts. Both sides of a move share one. */
  ref: string;
  note?: string;
  party?: Party;
  method?: Method;
  /** A move between your own accounts: the id of the entry on the other side. */
  pair?: string;
  card?: string;
  online?: boolean;
  /** When a pending entry (PESONet transfer, card hold) clears. */
  settleAt?: number;
  /** Why a card payment was declined. */
  reason?: string;
}

export interface Account {
  id: string;
  kind: 'checking' | 'savings';
  name: string;
  number: string;
  /** Balance brought forward from before the oldest entry. */
  opening: Cents;
  /** Savings only: the last month interest has been paid for, "YYYY-MM". */
  interestPaid?: string;
}

export const GOAL_ICONS = ['plane', 'house', 'car', 'laptop', 'gift', 'school', 'heart', 'umbrella', 'paw', 'star'] as const;
export type GoalIcon = (typeof GOAL_ICONS)[number];

export interface Goal {
  id: string;
  name: string;
  icon: GoalIcon;
  /** Index into the chart palette (see GOAL_SLOTS in src/theme.ts). */
  slot: number;
  target: Cents;
  opening: Cents;
  createdAt: number;
}

export interface Card {
  id: string;
  kind: 'physical' | 'virtual';
  name: string;
  number: string;
  expiry: string;
  cvv: string;
  /** The account the card spends from. */
  holder: string;
  frozen: boolean;
  online: boolean;
  contactless: boolean;
  atm: boolean;
  abroad: boolean;
  dailyLimit: Cents;
}
export const CARD_LIMIT_RANGE = [1_000_00, 200_000_00] as const;

export interface Recipient { id: string; name: string; bank: string; number: string; addedAt: number }
export interface SavedBiller { id: string; biller: string; ref: string }

export interface Books {
  owner: { name: string; since: number };
  accounts: Account[];
  goals: Goal[];
  /** Newest first. */
  txns: Txn[];
  cards: Card[];
  recipients: Recipient[];
  billers: SavedBiller[];
  budgets: Partial<Record<CategoryId, Cents>>;
}

export type Result<T> = { ok: true; books: Books; value: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false, error }) as const;

/* ---------------- Ids and reference numbers ---------------- */
let rand = Math.random;
/** Runs `fn` with a fixed random source, so the demo seed (and tests) get the same ids every time. */
export function withRandom<T>(source: () => number, fn: () => T): T {
  const prev = rand;
  rand = source;
  try { return fn(); } finally { rand = prev; }
}
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const pick = (n: number) => Array.from({ length: n }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join('');
export const newId = () => pick(14);
export const newRef = () => `FL${pick(10)}`;
export const randomDigits = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * 10)).join('');

/* ---------------- Reading the books ---------------- */
/** Declined card payments stay in the history but never move money. */
export const counts = (t: Txn) => t.status !== 'declined';
/** Money that left you: not declined, and not a move between your own accounts. */
export const isSpend = (t: Txn) => t.amount < 0 && t.kind !== 'move' && counts(t) && category(t.category).spend;
/** Money that came in from outside: pay, deposits, interest, people paying you. */
export const isIncome = (t: Txn) => t.amount > 0 && t.kind !== 'move' && counts(t);

const balanceCache = new WeakMap<Books, Record<string, Cents>>();
/** Every account's and goal's balance. Cached per version of the books (they're never mutated). */
export function balances(books: Books): Record<string, Cents> {
  let b = balanceCache.get(books);
  if (!b) {
    b = {};
    for (const a of books.accounts) b[a.id] = a.opening;
    for (const g of books.goals) b[g.id] = g.opening;
    for (const t of books.txns) if (counts(t) && t.holder in b) b[t.holder] += t.amount;
    balanceCache.set(books, b);
  }
  return b;
}
export const balanceOf = (books: Books, holder: string): Cents => balances(books)[holder] ?? 0;
/** Everything you have: all accounts plus all goals. */
export const totalBalance = (books: Books) => Object.values(balances(books)).reduce((a, b) => a + b, 0);
export const goalsTotal = (books: Books) => books.goals.reduce((a, g) => a + balanceOf(books, g.id), 0);

export const firstName = (books: Books) => books.owner.name.split(/\s+/)[0] ?? '';
export const everyday = (books: Books) => books.accounts.find(a => a.kind === 'checking') ?? books.accounts[0];
export function holderName(books: Books, id: string) {
  return books.accounts.find(a => a.id === id)?.name ?? books.goals.find(g => g.id === id)?.name ?? 'Closed goal';
}
export const isGoal = (books: Books, id: string) => books.goals.some(g => g.id === id);

/** Entries on accounts (not goals), newest first: the activity feed. */
export const accountTxns = (books: Books) => {
  const ids = new Set(books.accounts.map(a => a.id));
  return books.txns.filter(t => ids.has(t.holder));
};

export const inMonth = (t: Txn, month: string) => monthKey(t.at) === month;

/** Spending in a month by category, biggest first. Amounts are positive. */
export function spendByCategory(books: Books, month: string) {
  const by = new Map<CategoryId, Cents>();
  for (const t of books.txns) if (isSpend(t) && inMonth(t, month)) by.set(t.category, (by.get(t.category) ?? 0) - t.amount);
  return [...by].map(([id, amount]) => ({ id, amount })).sort((a, b) => b.amount - a.amount);
}

export function monthTotals(books: Books, month: string) {
  let moneyIn = 0;
  let moneyOut = 0;
  for (const t of books.txns) {
    if (!inMonth(t, month)) continue;
    if (isIncome(t)) moneyIn += t.amount;
    else if (isSpend(t)) moneyOut -= t.amount;
  }
  return { in: moneyIn, out: moneyOut };
}

/** Running total of spending through a month: index 0 is the end of day 1. Stops at `throughDay` if given. */
export function cumulativeSpend(books: Books, month: string, throughDay?: number): Cents[] {
  const days = throughDay ?? daysInMonth(month);
  const daily = new Array<Cents>(days).fill(0);
  for (const t of books.txns) {
    if (!isSpend(t) || !inMonth(t, month)) continue;
    const d = new Date(t.at).getDate();
    if (d <= days) daily[d - 1] -= t.amount;
  }
  for (let i = 1; i < days; i++) daily[i] += daily[i - 1];
  return daily;
}

/** The oldest month with any entries, so screens know how far back to let you go. */
export const firstMonth = (books: Books) => (books.txns.length ? monthKey(books.txns[books.txns.length - 1].at) : monthKey(Date.now()));

/** What's gone to other people and billers today (this is what the daily transfer limit counts). */
export function sentToday(books: Books, now: number) {
  const today = dayKey(now);
  return books.txns.reduce((s, t) => ((t.kind === 'transfer' || t.kind === 'bill') && t.amount < 0 && counts(t) && dayKey(t.at) === today ? s - t.amount : s), 0);
}
export function cardSpentToday(books: Books, cardId: string, now: number) {
  const today = dayKey(now);
  return books.txns.reduce((s, t) => (t.card === cardId && t.amount < 0 && counts(t) && dayKey(t.at) === today ? s - t.amount : s), 0);
}

/* ---------------- Writing ---------------- */
function post(books: Books, ...txns: Txn[]): Books {
  return { ...books, txns: [...txns, ...books.txns].sort((a, b) => b.at - a.at) };
}

function checkFunds(books: Books, from: string, amount: Cents, fee = 0) {
  if (!Number.isInteger(amount) || amount <= 0) return 'Enter an amount';
  if (!books.accounts.some(a => a.id === from)) return 'Choose an account to pay from';
  const available = balanceOf(books, from);
  if (amount + fee > available) {
    return fee ? `With the ${money(fee)} fee, that's more than the ${money(available)} you have` : `That's more than the ${money(available)} you have`;
  }
  return null;
}

function checkDaily(books: Books, amount: Cents, now: number) {
  const left = DAILY_TRANSFER_LIMIT - sentToday(books, now);
  if (amount <= left) return null;
  return left > 0 ? `That's over your daily limit. You can send ${money(left)} more today.` : 'You’ve reached today’s transfer limit. You can send again tomorrow.';
}

export interface SendInput {
  from: string;
  to: { name: string; bank: string; number: string };
  amount: Cents;
  method: Method;
  note?: string;
}

/** A transfer to someone at another bank or e-wallet. Problems come back as a sentence; null means OK. */
export function checkSend(books: Books, input: SendInput, now: number): string | null {
  if (!input.to.name.trim()) return 'Add the name of the person you’re paying';
  const problem = checkAccountNumber(input.to.bank, input.to.number) ?? checkFunds(books, input.from, input.amount, FEES[input.method]);
  if (problem) return problem;
  if (input.method === 'instapay' && input.amount > INSTANT_LIMIT) {
    return `InstaPay sends up to ${money(INSTANT_LIMIT, { whole: true })} at a time. Choose PESONet for more.`;
  }
  return checkDaily(books, input.amount, now);
}

export function sendMoney(books: Books, input: SendInput, now: number): Result<Txn> {
  const error = checkSend(books, input, now);
  if (error) return fail(error);
  const pesonet = input.method === 'pesonet';
  const t: Txn = {
    id: newId(), holder: input.from, amount: -input.amount, at: now, title: input.to.name.trim(), category: 'transfers', kind: 'transfer',
    status: pesonet ? 'pending' : 'done', settleAt: pesonet ? nextBankingDay(now) : undefined, ref: newRef(), method: input.method,
    party: { name: input.to.name.trim(), bank: input.to.bank, number: input.to.number.replace(/\s/g, '') },
    note: input.note?.trim() || undefined,
  };
  const fee = FEES[input.method];
  const feeTxn: Txn[] = fee ? [{ id: newId(), holder: input.from, amount: -fee, at: now, title: 'Transfer fee', category: 'fees', kind: 'fee', status: 'done', ref: t.ref }] : [];
  return { ok: true, books: post(books, t, ...feeTxn), value: t };
}

export interface BillInput { from: string; biller: Biller; ref: string; amount: Cents }

export function checkBill(books: Books, input: BillInput, now: number): string | null {
  return checkBillRef(input.biller, input.ref) ?? checkFunds(books, input.from, input.amount) ?? checkDaily(books, input.amount, now);
}

export function payBill(books: Books, input: BillInput, now: number): Result<Txn> {
  const error = checkBill(books, input, now);
  if (error) return fail(error);
  const t: Txn = {
    id: newId(), holder: input.from, amount: -input.amount, at: now, title: input.biller.name, category: 'bills', kind: 'bill', status: 'done',
    ref: newRef(), party: { name: input.biller.name, number: input.ref.replace(/\s/g, '') },
  };
  return { ok: true, books: post(books, t), value: t };
}

export interface MoveInput { from: string; to: string; amount: Cents; note?: string }

export function checkMove(books: Books, input: MoveInput): string | null {
  const known = (id: string) => books.accounts.some(a => a.id === id) || books.goals.some(g => g.id === id);
  if (!known(input.from) || !known(input.to)) return 'Choose where the money comes from and goes to';
  if (input.from === input.to) return 'Choose two different places';
  if (!Number.isInteger(input.amount) || input.amount <= 0) return 'Enter an amount';
  const available = balanceOf(books, input.from);
  if (input.amount > available) return `There's only ${money(available)} in ${holderName(books, input.from)}`;
  return null;
}

/** Moves money between your own accounts and goals: instant, free, two linked entries. */
export function moveMoney(books: Books, input: MoveInput, now: number): Result<[Txn, Txn]> {
  const error = checkMove(books, input);
  if (error) return fail(error);
  const ref = newRef();
  const note = input.note?.trim() || undefined;
  const out: Txn = {
    id: newId(), holder: input.from, amount: -input.amount, at: now, title: `To ${holderName(books, input.to)}`,
    category: 'savings', kind: 'move', status: 'done', ref, note,
  };
  const into: Txn = {
    id: newId(), holder: input.to, amount: input.amount, at: now, title: `From ${holderName(books, input.from)}`,
    category: 'savings', kind: 'move', status: 'done', ref, note, pair: out.id,
  };
  out.pair = into.id;
  return { ok: true, books: post(books, out, into), value: [out, into] };
}

export interface DepositInput { to: string; amount: Cents; title: string; kind?: 'deposit' | 'salary' | 'transfer'; party?: Party; note?: string }
/** Money arriving from outside (in the demo: "Add money", pay day, a friend paying you back). */
export function deposit(books: Books, input: DepositInput, now: number): Result<Txn> {
  if (!books.accounts.some(a => a.id === input.to)) return fail('Choose an account');
  if (!Number.isInteger(input.amount) || input.amount <= 0) return fail('Enter an amount');
  if (input.amount > 1_000_000_00) return fail(`You can add up to ${money(1_000_000_00, { whole: true })} at a time`);
  const t: Txn = {
    id: newId(), holder: input.to, amount: input.amount, at: now, title: input.title, category: 'income', kind: input.kind ?? 'deposit',
    status: 'done', ref: newRef(), party: input.party, note: input.note,
  };
  return { ok: true, books: post(books, t), value: t };
}

export interface CardPaymentInput { card: string; merchant: string; amount: Cents; category: CategoryId; online: boolean; abroad?: boolean }

/** A card payment is approved (held as pending until it clears) or declined with a reason. Both are recorded. */
export function cardPayment(books: Books, input: CardPaymentInput, now: number): Result<Txn> {
  const card = books.cards.find(c => c.id === input.card);
  if (!card) return fail('Card not found');
  if (!Number.isInteger(input.amount) || input.amount <= 0) return fail('Enter an amount');
  const reason =
    card.frozen ? 'Card is frozen'
      : input.online && !card.online ? 'Online payments are turned off'
        : !input.online && !card.contactless ? 'Contactless payments are turned off'
          : input.abroad && !card.abroad ? 'Payments abroad are turned off'
            : cardSpentToday(books, card.id, now) + input.amount > card.dailyLimit ? 'Over the card’s daily limit'
              : input.amount > balanceOf(books, card.holder) ? 'Not enough money in the account'
                : undefined;
  const t: Txn = {
    id: newId(), holder: card.holder, amount: -input.amount, at: now, title: input.merchant, category: input.category, kind: 'card',
    status: reason ? 'declined' : 'pending', settleAt: reason ? undefined : startOfDay(now) + 2 * DAY + 2 * 3_600_000,
    ref: newRef(), card: card.id, online: input.online, reason,
  };
  return { ok: true, books: post(books, t), value: t };
}

/** Clears pending entries whose time has come. Returns the same books when nothing changed. */
export function settle(books: Books, now: number): Books {
  if (!books.txns.some(t => t.status === 'pending' && (t.settleAt ?? 0) <= now)) return books;
  return {
    ...books,
    txns: books.txns.map(t => (t.status === 'pending' && (t.settleAt ?? 0) <= now ? { ...t, status: 'done' as const, settleAt: undefined } : t)),
  };
}

/** Balance at a moment in time: opening plus every entry before it. */
function balanceAt(books: Books, holder: string, at: number, opening: Cents) {
  return books.txns.reduce((s, t) => (t.holder === holder && counts(t) && t.at < at ? s + t.amount : s), opening);
}

/**
 * Pays savings interest for every finished month that hasn't been paid yet, on the 1st of the next month:
 * the month-end balance × the yearly rate ÷ 12.
 */
export function payInterest(books: Books, now: number): Books {
  let next = books;
  const current = monthKey(now);
  for (const a of books.accounts) {
    if (a.kind !== 'savings') continue;
    let paid = a.interestPaid ?? addMonths(current, -1);
    for (let m = addMonths(paid, 1); m < current; m = addMonths(m, 1)) {
      const at = monthStart(addMonths(m, 1)) + 5 * 60_000;
      const interest = Math.round((Math.max(0, balanceAt(next, a.id, at, a.opening)) * SAVINGS_RATE) / 100 / 12);
      if (interest > 0) {
        next = post(next, { id: newId(), holder: a.id, amount: interest, at, title: 'Interest earned', category: 'income', kind: 'interest', status: 'done', ref: newRef() });
      }
      paid = m;
    }
    if (paid !== a.interestPaid) next = { ...next, accounts: next.accounts.map(x => (x.id === a.id ? { ...x, interestPaid: paid } : x)) };
  }
  return next;
}

/** Folds entries older than `keepDays` into each holder's opening balance, so storage stays small. */
export function compact(books: Books, now: number, keepDays = 400): Books {
  const cutoff = now - keepDays * DAY;
  const old = books.txns.filter(t => t.at < cutoff && t.status !== 'pending');
  if (!old.length) return books;
  const carried: Record<string, Cents> = {};
  for (const t of old) if (counts(t)) carried[t.holder] = (carried[t.holder] ?? 0) + t.amount;
  return {
    ...books,
    accounts: books.accounts.map(a => ({ ...a, opening: a.opening + (carried[a.id] ?? 0) })),
    goals: books.goals.map(g => ({ ...g, opening: g.opening + (carried[g.id] ?? 0) })),
    txns: books.txns.filter(t => !(t.at < cutoff && t.status !== 'pending')),
  };
}

/* ---------------- Goals ---------------- */
export interface GoalInput { name: string; icon: GoalIcon; slot: number; target: Cents }

export function checkGoal(input: GoalInput): string | null {
  if (!input.name.trim()) return 'Give your goal a name';
  if (input.name.trim().length > 30) return 'Keep the name under 30 characters';
  if (!Number.isInteger(input.target) || input.target <= 0) return 'Set how much you want to save';
  return null;
}

export function createGoal(books: Books, input: GoalInput, now: number): Result<Goal> {
  const error = checkGoal(input);
  if (error) return fail(error);
  if (books.goals.length >= MAX_GOALS) return fail(`You can have up to ${MAX_GOALS} goals`);
  const goal: Goal = { id: newId(), name: input.name.trim(), icon: input.icon, slot: input.slot, target: input.target, opening: 0, createdAt: now };
  return { ok: true, books: { ...books, goals: [...books.goals, goal] }, value: goal };
}

export function updateGoal(books: Books, id: string, input: GoalInput): Result<Goal> {
  const error = checkGoal(input);
  if (error) return fail(error);
  const goal = books.goals.find(g => g.id === id);
  if (!goal) return fail('Goal not found');
  const next = { ...goal, name: input.name.trim(), icon: input.icon, slot: input.slot, target: input.target };
  return { ok: true, books: { ...books, goals: books.goals.map(g => (g.id === id ? next : g)) }, value: next };
}

/** Closes a goal: whatever is in it goes back to the everyday account first. */
export function closeGoal(books: Books, id: string, now: number): Result<Cents> {
  if (!books.goals.some(g => g.id === id)) return fail('Goal not found');
  const left = balanceOf(books, id);
  let next = books;
  if (left > 0) {
    const moved = moveMoney(books, { from: id, to: everyday(books).id, amount: left }, now);
    if (!moved.ok) return moved;
    next = moved.books;
  }
  return { ok: true, books: { ...next, goals: next.goals.filter(g => g.id !== id), txns: next.txns.filter(t => t.holder !== id) }, value: left };
}

/* ---------------- People, billers, budgets, cards ---------------- */
export function addRecipient(books: Books, input: { name: string; bank: string; number: string }, now: number): Result<Recipient> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  const number = input.number.replace(/\s/g, '');
  if (!name) return fail('Add their name');
  const problem = checkAccountNumber(input.bank, number);
  if (problem) return fail(problem);
  const existing = books.recipients.find(r => r.bank === input.bank && r.number === number);
  if (existing) return { ok: true, books, value: existing };
  const r: Recipient = { id: newId(), name, bank: input.bank, number, addedAt: now };
  return { ok: true, books: { ...books, recipients: [r, ...books.recipients] }, value: r };
}
export const removeRecipient = (books: Books, id: string): Books => ({ ...books, recipients: books.recipients.filter(r => r.id !== id) });

export function saveBiller(books: Books, billerId: string, ref: string): Books {
  const clean = ref.replace(/\s/g, '');
  if (books.billers.some(b => b.biller === billerId && b.ref === clean)) return books;
  return { ...books, billers: [...books.billers, { id: newId(), biller: billerId, ref: clean }] };
}
export const removeBiller = (books: Books, id: string): Books => ({ ...books, billers: books.billers.filter(b => b.id !== id) });

export function setBudget(books: Books, cat: CategoryId, amount: Cents | null): Books {
  const budgets = { ...books.budgets };
  if (amount && amount > 0) budgets[cat] = amount;
  else delete budgets[cat];
  return { ...books, budgets };
}

export function editTxn(books: Books, id: string, patch: Pick<Partial<Txn>, 'category' | 'note'>): Books {
  const note = patch.note === undefined ? undefined : patch.note.trim().slice(0, 80);
  return {
    ...books,
    txns: books.txns.map(t => (t.id === id ? { ...t, ...patch, ...(patch.note !== undefined ? { note: note || undefined } : null) } : t)),
  };
}

export function updateCard(books: Books, id: string, patch: Partial<Pick<Card, 'frozen' | 'online' | 'contactless' | 'atm' | 'abroad' | 'dailyLimit'>>): Books {
  const limit = patch.dailyLimit === undefined ? undefined : Math.min(CARD_LIMIT_RANGE[1], Math.max(CARD_LIMIT_RANGE[0], Math.round(patch.dailyLimit)));
  return { ...books, cards: books.cards.map(c => (c.id === id ? { ...c, ...patch, ...(limit !== undefined ? { dailyLimit: limit } : null) } : c)) };
}

/** A new card number (16 digits, valid check digit), expiry four years out and CVV. */
export function cardDetails(now: number) {
  const body = '5' + randomDigits(14);
  const digits = body.split('').map(Number);
  // Luhn: double every second digit from the right of the full 16-digit number (so from the left here).
  const sum = digits.reduce((s, d, i) => s + (i % 2 === 0 ? (d * 2 > 9 ? d * 2 - 9 : d * 2) : d), 0);
  const check = (10 - (sum % 10)) % 10;
  const d = new Date(now);
  return {
    number: body + check,
    expiry: `${String(d.getMonth() + 1).padStart(2, '0')}/${String((d.getFullYear() + 4) % 100).padStart(2, '0')}`,
    cvv: randomDigits(3),
  };
}

/** Cancels a lost card and issues a new number. The old number stops working immediately. */
export function replaceCard(books: Books, id: string, now: number): Books {
  return { ...books, cards: books.cards.map(c => (c.id === id ? { ...c, ...cardDetails(now), frozen: false } : c)) };
}

export const bankOf = (id: string) => BANKS.find(b => b.id === id);
