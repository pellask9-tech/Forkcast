/// <reference types="jest" />
import { DAILY_TRANSFER_LIMIT, INSTANT_LIMIT, SAVINGS_RATE } from '@/config';
import { biller, SPEND_CATEGORIES } from '@/lib/catalog';
import { DAY, monthKey } from '@/lib/dates';
import {
  accountTxns, addRecipient, balanceOf, balances, cardPayment, closeGoal, compact, createGoal, cumulativeSpend, deposit, isSpend,
  monthTotals, moveMoney, payBill, payInterest, sendMoney, sentToday, settle, spendByCategory, totalBalance, updateCard, type Books,
} from '@/lib/ledger';
import { demoBooks, EVERYDAY_ID, SAVINGS_ID } from '@/lib/seed';

const NOW = new Date(2026, 9, 17, 15, 30).getTime();
const friend = { name: 'Mika Santos', bank: 'gcash', number: '09171234567' };
const fresh = (): Books => demoBooks('Ria', NOW);
const sumBalances = (b: Books) => Object.values(balances(b)).reduce((a, c) => a + c, 0);

describe('demo books', () => {
  const books = fresh();

  it('are the same every time for the same day', () => {
    expect(JSON.stringify(demoBooks('Ria', NOW))).toBe(JSON.stringify(books));
  });

  it('cover six months, newest first, with nothing in the future', () => {
    expect(books.txns.length).toBeGreaterThan(300);
    expect(books.txns.every((t, i) => i === 0 || books.txns[i - 1].at >= t.at)).toBe(true);
    expect(books.txns[0].at).toBeLessThanOrEqual(NOW);
    expect(monthKey(books.txns[books.txns.length - 1].at)).toBe('2026-05');
  });

  it('never let an account or goal go below zero along the way', () => {
    const running: Record<string, number> = Object.fromEntries([...books.accounts, ...books.goals].map(h => [h.id, h.opening]));
    for (const t of [...books.txns].reverse()) {
      if (t.status === 'declined') continue;
      running[t.holder] += t.amount;
      expect(running[t.holder]).toBeGreaterThanOrEqual(0);
    }
    expect(balanceOf(books, EVERYDAY_ID)).toBeGreaterThan(5_000_00);
  });

  it('pay salary twice a month, rent and interest monthly, and keep moves balanced', () => {
    const sept = books.txns.filter(t => monthKey(t.at) === '2026-09');
    expect(sept.filter(t => t.kind === 'salary')).toHaveLength(2);
    expect(sept.filter(t => t.note === 'Rent')).toHaveLength(1);
    expect(sept.filter(t => t.kind === 'interest')).toHaveLength(1);
    const moves = books.txns.filter(t => t.kind === 'move');
    expect(moves.reduce((s, t) => s + t.amount, 0)).toBe(0);
    for (const m of moves) expect(books.txns.find(t => t.id === m.pair)?.pair).toBe(m.id);
  });

  it('show recent card payments as pending and settle them later', () => {
    expect(books.txns.some(t => t.status === 'pending' && t.kind === 'card')).toBe(true);
    const later = settle(books, NOW + 3 * DAY);
    expect(later.txns.some(t => t.status === 'pending')).toBe(false);
    expect(settle(later, NOW + 4 * DAY)).toBe(later);
  });

  it('split this month into income and spending by category', () => {
    const month = monthKey(NOW);
    const totals = monthTotals(books, month);
    const cats = spendByCategory(books, month);
    expect(cats.reduce((s, c) => s + c.amount, 0)).toBe(totals.out);
    expect(cats.every(c => SPEND_CATEGORIES.some(x => x.id === c.id))).toBe(true);
    const running = cumulativeSpend(books, month, 17);
    expect(running).toHaveLength(17);
    expect(running[16]).toBe(totals.out);
    expect(totals.in).toBeGreaterThan(0);
  });
});

describe('sending money', () => {
  it('takes it from the account with a reference and keeps the books balanced', () => {
    const books = fresh();
    const before = balanceOf(books, EVERYDAY_ID);
    const r = sendMoney(books, { from: EVERYDAY_ID, to: friend, amount: 1_250_00, method: 'instapay', note: ' Dinner ' }, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(balanceOf(r.books, EVERYDAY_ID)).toBe(before - 1_250_00);
    expect(r.value).toMatchObject({ status: 'done', title: 'Mika Santos', note: 'Dinner', party: { bank: 'gcash', number: '09171234567' } });
    expect(r.value.ref).toMatch(/^FL[2-9A-Z]{10}$/);
    expect(accountTxns(r.books)[0].id).toBe(r.value.id);
    expect(books.txns.length).toBe(r.books.txns.length - 1);
  });

  it('refuses more than the balance, the InstaPay cap and the daily limit', () => {
    const books = fresh();
    const bal = balanceOf(books, EVERYDAY_ID);
    const send = (amount: number, method: 'instapay' | 'pesonet' = 'instapay', b = books) => sendMoney(b, { from: EVERYDAY_ID, to: friend, amount, method }, NOW);
    expect(send(0)).toEqual({ ok: false, error: 'Enter an amount' });
    expect(send(bal + 1)).toMatchObject({ ok: false, error: expect.stringContaining('more than the') });
    const rich = deposit(books, { to: EVERYDAY_ID, amount: 1_000_000_00, title: 'Test' }, NOW);
    if (!rich.ok) throw new Error(rich.error);
    expect(send(INSTANT_LIMIT + 1, 'instapay', rich.books)).toMatchObject({ ok: false, error: expect.stringContaining('PESONet') });
    const big = send(INSTANT_LIMIT + 1, 'pesonet', rich.books);
    expect(big.ok).toBe(true);
    if (!big.ok) return;
    expect(big.value.status).toBe('pending');
    const left = DAILY_TRANSFER_LIMIT - sentToday(big.books, NOW);
    expect(send(left + 1, 'pesonet', big.books)).toMatchObject({ ok: false, error: expect.stringContaining('daily limit') });
    expect(send(left, 'pesonet', big.books).ok).toBe(true);
  });

  it('checks the account number for the bank or wallet', () => {
    const books = fresh();
    expect(sendMoney(books, { from: EVERYDAY_ID, to: { ...friend, number: '12345' }, amount: 100, method: 'instapay' }, NOW))
      .toEqual({ ok: false, error: 'Enter the 11-digit mobile number, starting with 09' });
    expect(addRecipient(books, { name: 'Ana', bank: 'bpi', number: '12 34' }, NOW)).toEqual({ ok: false, error: 'Account numbers have 10 to 16 digits' });
    const added = addRecipient(books, { name: '  Ana   Lim ', bank: 'bpi', number: '1234 5678 90' }, NOW);
    expect(added.ok && added.value).toMatchObject({ name: 'Ana Lim', number: '1234567890' });
  });
});

describe('bills, moves and goals', () => {
  it('pays a biller and counts it toward the daily limit', () => {
    const books = fresh();
    const r = payBill(books, { from: EVERYDAY_ID, biller: biller('meralco')!, ref: '1234567890', amount: 2_000_00 }, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(r.value).toMatchObject({ kind: 'bill', category: 'bills', title: 'Meralco' });
    expect(sentToday(r.books, NOW) - sentToday(books, NOW)).toBe(2_000_00);
    expect(payBill(books, { from: EVERYDAY_ID, biller: biller('bdocc')!, ref: '1234', amount: 100 }, NOW)).toEqual({ ok: false, error: 'Card numbers have 16 digits' });
  });

  it('moves between your own accounts without counting as spending', () => {
    const books = fresh();
    const total = totalBalance(books);
    const r = moveMoney(books, { from: EVERYDAY_ID, to: SAVINGS_ID, amount: 3_000_00 }, NOW);
    if (!r.ok) throw new Error(r.error);
    const [out, into] = r.value;
    expect(out.pair).toBe(into.id);
    expect(into.pair).toBe(out.id);
    expect(out.ref).toBe(into.ref);
    expect(totalBalance(r.books)).toBe(total);
    expect(isSpend(out)).toBe(false);
    expect(monthTotals(r.books, monthKey(NOW))).toEqual(monthTotals(books, monthKey(NOW)));
    expect(moveMoney(books, { from: SAVINGS_ID, to: SAVINGS_ID, amount: 1 }, NOW)).toEqual({ ok: false, error: 'Choose two different places' });
  });

  it('closes a goal by returning its money to Everyday', () => {
    let books = fresh();
    const g = createGoal(books, { name: 'Bike', icon: 'star', slot: 2, target: 30_000_00 }, NOW);
    if (!g.ok) throw new Error(g.error);
    const m = moveMoney(g.books, { from: EVERYDAY_ID, to: g.value.id, amount: 1_500_00 }, NOW);
    if (!m.ok) throw new Error(m.error);
    books = m.books;
    const everydayBefore = balanceOf(books, EVERYDAY_ID);
    const closed = closeGoal(books, g.value.id, NOW + 1000);
    if (!closed.ok) throw new Error(closed.error);
    expect(closed.value).toBe(1_500_00);
    expect(balanceOf(closed.books, EVERYDAY_ID)).toBe(everydayBefore + 1_500_00);
    expect(closed.books.goals.some(x => x.id === g.value.id)).toBe(false);
    expect(createGoal(books, { name: ' ', icon: 'star', slot: 0, target: 1 }, NOW)).toEqual({ ok: false, error: 'Give your goal a name' });
  });
});

describe('cards', () => {
  const buy = (books: Books, extra: Partial<Parameters<typeof cardPayment>[1]> = {}) =>
    cardPayment(books, { card: 'card-debit', merchant: 'Jollibee', amount: 300_00, category: 'dining', online: false, ...extra }, NOW);

  it('holds an approved payment as pending', () => {
    const r = buy(fresh());
    expect(r.ok && r.value.status).toBe('pending');
  });

  it('declines with a reason when frozen, switched off, over the limit or short', () => {
    const books = fresh();
    expect(buy(updateCard(books, 'card-debit', { frozen: true }))).toMatchObject({ ok: true, value: { status: 'declined', reason: 'Card is frozen' } });
    expect(buy(updateCard(books, 'card-debit', { online: false }), { online: true })).toMatchObject({ value: { reason: 'Online payments are turned off' } });
    expect(buy(books, { abroad: true })).toMatchObject({ value: { reason: 'Payments abroad are turned off' } });
    expect(buy(updateCard(books, 'card-debit', { dailyLimit: 1_000_00 }), { amount: 2_000_00 })).toMatchObject({ value: { reason: 'Over the card’s daily limit' } });
    expect(buy(updateCard(books, 'card-debit', { dailyLimit: 200_000_00 }), { amount: balanceOf(books, EVERYDAY_ID) + 1 })).toMatchObject({ value: { reason: 'Not enough money in the account' } });
    const declined = buy(updateCard(books, 'card-debit', { frozen: true }));
    expect(declined.ok && balanceOf(declined.books, EVERYDAY_ID)).toBe(balanceOf(books, EVERYDAY_ID));
  });

  it('keeps the daily limit inside the allowed range', () => {
    expect(updateCard(fresh(), 'card-debit', { dailyLimit: 5 }).cards[0].dailyLimit).toBe(1_000_00);
  });
});

describe('interest and housekeeping', () => {
  it('pays each finished month once, on the 1st', () => {
    const books = fresh();
    const savings = balanceOf(books, SAVINGS_ID);
    const nextMonth = new Date(2026, 10, 3).getTime();
    const paid = payInterest(books, nextMonth);
    const interest = paid.txns.filter(t => t.kind === 'interest' && monthKey(t.at) === '2026-11');
    expect(interest).toHaveLength(1);
    expect(interest[0].amount).toBe(Math.round((savings * SAVINGS_RATE) / 100 / 12));
    expect(payInterest(paid, nextMonth)).toBe(paid);
  });

  it('folds old entries into opening balances without changing any balance', () => {
    const books = fresh();
    const small = compact(books, NOW, 30);
    expect(small.txns.length).toBeLessThan(books.txns.length);
    expect(balances(small)).toEqual(balances(books));
    expect(sumBalances(small)).toBe(sumBalances(books));
  });
});
