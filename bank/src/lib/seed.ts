/**
 * The demo customer's last five months: pay twice a month, rent, bills, everyday spending, savings and goals.
 * Built from a fixed seed, so the same day always produces the same history. Dates are relative to today
 * so the demo always looks current. None of this is real money or real people.
 */
import { SAVINGS_RATE } from '@/config';
import type { CategoryId } from './catalog';
import { addMonths, DAY, daysInMonth, monthKey, monthStart, startOfDay } from './dates';
import { cardDetails, newId, newRef, randomDigits, withRandom, type Account, type Books, type Card, type Goal, type Party, type Recipient, type Txn } from './ledger';
import type { Cents } from './money';

/** mulberry32: a tiny repeatable random number generator. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Merchant { name: string; min: number; max: number; online?: boolean }
const COFFEE: Merchant[] = [{ name: 'Starbucks', min: 165, max: 420 }, { name: "Bo's Coffee", min: 140, max: 360 }];
const LUNCH: Merchant[] = [
  { name: 'Jollibee', min: 160, max: 520 }, { name: "McDonald's", min: 150, max: 480 },
  { name: 'Mang Inasal', min: 180, max: 450 }, { name: 'Chowking', min: 170, max: 430 },
];
const DELIVERY: Merchant[] = [{ name: 'GrabFood', min: 280, max: 950, online: true }, { name: 'foodpanda', min: 260, max: 880, online: true }];
const DINE_OUT: Merchant[] = [{ name: "Max's Restaurant", min: 650, max: 1850 }, { name: 'Army Navy', min: 380, max: 900 }, ...LUNCH];
const GROCERY: Merchant[] = [
  { name: 'SM Supermarket', min: 1200, max: 4800 }, { name: 'Puregold', min: 900, max: 3800 },
  { name: 'Robinsons Supermarket', min: 1100, max: 4200 }, { name: 'S&R Membership Shopping', min: 2500, max: 6500 },
];
const TOP_UP: Merchant[] = [{ name: '7-Eleven', min: 85, max: 380 }, { name: 'Puregold Jr.', min: 250, max: 900 }];
const SHOPS: Merchant[] = [
  { name: 'Shopee', min: 250, max: 3200, online: true }, { name: 'Lazada', min: 300, max: 3500, online: true },
  { name: 'Uniqlo', min: 790, max: 2990 }, { name: 'SM Store', min: 500, max: 2800 },
  { name: 'National Book Store', min: 150, max: 1200 }, { name: 'Ace Hardware', min: 250, max: 1800 },
];
const PHARMACY: Merchant[] = [{ name: 'Mercury Drug', min: 150, max: 1200 }, { name: 'Watsons', min: 180, max: 950 }, { name: 'The Generics Pharmacy', min: 120, max: 650 }];

const FRIENDS = [
  { name: 'Mika Santos', bank: 'gcash', prefix: '0917' },
  { name: 'Paolo Reyes', bank: 'bpi' },
  { name: 'Bea Cruz', bank: 'maya', prefix: '0918' },
  { name: 'Nico Villanueva', bank: 'unionbank' },
];
const OUT_NOTES = ['Dinner', 'Grab home', 'Movie tickets', 'Pizza night', 'Birthday gift', 'Groceries', 'Concert'];
const IN_NOTES = ['Thanks!', 'Lunch', 'My share', 'Coffee', 'Paying you back'];

export const EVERYDAY_ID = 'everyday';
export const SAVINGS_ID = 'savings';
const SALARY = 42_500_00;
const RENT = 14_000_00;
/** Spending the demo person would skip rather than go below this, so rent and bills always fit. */
const BUFFER = 5_000_00;

export function demoBooks(name: string, now: number): Books {
  // One seeded source feeds both this file and the ledger's ids and references, so every run matches.
  const r = seeded(0xf102026);
  return withRandom(r, () => build(name, now, r));
}

function build(name: string, now: number, r: () => number): Books {
  const between = (min: number, max: number) => min + r() * (max - min);
  const chance = (p: number) => r() < p;
  const one = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  /** Whole pesos, or with centavos in 25-centavo steps like a supermarket receipt. */
  const price = (m: { min: number; max: number }, cents = false): Cents => (cents ? Math.round(between(m.min, m.max) * 4) * 25 : Math.round(between(m.min, m.max)) * 100);
  const time = (day: number, from: number, to: number) => day + Math.floor(between(from * 60, to * 60)) * 60_000;

  const thisMonth = monthKey(now);
  const start = monthStart(addMonths(thisMonth, -5));
  const today = startOfDay(now);

  const accounts: Account[] = [
    { id: EVERYDAY_ID, kind: 'checking', name: 'Everyday', number: '0128' + randomDigits(8), opening: 31_250_75 },
    { id: SAVINGS_ID, kind: 'savings', name: 'Savings', number: '0128' + randomDigits(8), opening: 96_000_00, interestPaid: addMonths(thisMonth, -1) },
  ];
  const goals: Goal[] = [
    { id: 'goal-japan', name: 'Japan trip', icon: 'plane', slot: 0, target: 120_000_00, opening: 24_000_00, createdAt: start },
    { id: 'goal-xmas', name: 'Christmas gifts', icon: 'gift', slot: 1, target: 25_000_00, opening: 0, createdAt: monthStart(addMonths(thisMonth, -2)) },
    { id: 'goal-laptop', name: 'New laptop', icon: 'laptop', slot: 5, target: 70_000_00, opening: 0, createdAt: monthStart(addMonths(thisMonth, -3)) },
  ];
  const cards: Card[] = [
    { id: 'card-debit', kind: 'physical', name: 'Debit card', ...cardDetails(start), holder: EVERYDAY_ID, frozen: false, online: true, contactless: true, atm: true, abroad: false, dailyLimit: 50_000_00 },
    { id: 'card-online', kind: 'virtual', name: 'Online card', ...cardDetails(start), holder: EVERYDAY_ID, frozen: false, online: true, contactless: false, atm: false, abroad: true, dailyLimit: 20_000_00 },
  ];
  const recipients: Recipient[] = [
    ...FRIENDS.map(f => ({ id: newId(), name: f.name, bank: f.bank, number: f.prefix ? f.prefix + randomDigits(7) : randomDigits(12), addedAt: start })),
    { id: newId(), name: 'Carmela Reyes', bank: 'bdo', number: randomDigits(12), addedAt: start },
  ];
  const landlord = recipients[recipients.length - 1];
  const partyOf = (rc: Recipient): Party => ({ name: rc.name, bank: rc.bank, number: rc.number });

  const txns: Txn[] = [];
  const bal: Record<string, Cents> = Object.fromEntries([...accounts, ...goals].map(h => [h.id, h.opening]));
  const nameOf = (id: string) => [...accounts, ...goals].find(h => h.id === id)!.name;

  const add = (t: Omit<Txn, 'id' | 'ref' | 'status'> & { status?: Txn['status'] }) => {
    if (t.at > now) return;
    txns.push({ id: newId(), ref: newRef(), status: 'done', ...t });
    bal[t.holder] += t.amount;
  };
  const move = (from: string, to: string, amount: Cents, at: number) => {
    if (at > now || bal[from] < amount) return;
    const ref = newRef();
    const out: Txn = { id: newId(), holder: from, amount: -amount, at, title: `To ${nameOf(to)}`, category: 'savings', kind: 'move', status: 'done', ref };
    const into: Txn = { id: newId(), holder: to, amount, at, title: `From ${nameOf(from)}`, category: 'savings', kind: 'move', status: 'done', ref, pair: out.id };
    out.pair = into.id;
    txns.push(out, into);
    bal[from] -= amount;
    bal[to] += amount;
  };
  /** A card payment from Everyday. Recent ones are still pending, like a real card hold. */
  const card = (m: Merchant, cat: CategoryId, at: number, amount = price(m, cat === 'groceries' || cat === 'shopping' || cat === 'health'), essential = false) => {
    if (!essential && bal[EVERYDAY_ID] - amount < BUFFER) return;
    const pending = at > today - DAY;
    add({
      holder: EVERYDAY_ID, amount: -amount, at, title: m.name, category: cat, kind: 'card', card: m.online ? 'card-online' : 'card-debit', online: !!m.online,
      ...(pending ? { status: 'pending' as const, settleAt: startOfDay(at) + 2 * DAY + 2 * 3_600_000 } : null),
    });
  };
  const bill = (name: string, amount: Cents, at: number) =>
    add({ holder: EVERYDAY_ID, amount: -amount, at, title: name, category: 'bills', kind: 'bill', party: { name, number: randomDigits(10) } });

  for (let day = start; day <= today; day = startOfDay(day + DAY + 3_600_000)) {
    const d = new Date(day);
    const dom = d.getDate();
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    const month = monthKey(day);
    const dim = daysInMonth(month);
    // Pay day is the 15th and the last day of the month, or the Friday before when that's a weekend.
    const payDay = (n: number) => { const p = new Date(d.getFullYear(), d.getMonth(), n); while (p.getDay() === 0 || p.getDay() === 6) p.setDate(p.getDate() - 1); return p.getDate(); };
    const events: { at: number; run: (at: number) => void }[] = [];
    const on = (at: number, run: (at: number) => void) => events.push({ at, run });

    if (dom === 1) {
      on(day + 5 * 60_000, at => {
        const interest = Math.round((bal[SAVINGS_ID] * SAVINGS_RATE) / 100 / 12);
        add({ holder: SAVINGS_ID, amount: interest, at, title: 'Interest earned', category: 'income', kind: 'interest' });
      });
      on(time(day, 10, 11), at => add({ holder: EVERYDAY_ID, amount: -RENT, at, title: landlord.name, category: 'bills', kind: 'transfer', method: 'instapay', note: 'Rent', party: partyOf(landlord) }));
    }
    for (const pay of [payDay(15), payDay(dim)]) {
      if (dom !== pay) continue;
      const midMonth = pay === payDay(15);
      on(time(day, 8, 8.75), at => add({ holder: EVERYDAY_ID, amount: SALARY, at, title: 'Lumen Creative Studio', category: 'income', kind: 'salary', note: 'Salary', party: { name: 'Lumen Creative Studio', bank: 'bdo' } }));
      on(day + 9 * 3_600_000, at => {
        if (midMonth) move(EVERYDAY_ID, SAVINGS_ID, 8_000_00, at);
        move(EVERYDAY_ID, 'goal-japan', 2_500_00, at + 60_000);
        if (day >= goals[1].createdAt) move(EVERYDAY_ID, 'goal-xmas', 1_500_00, at + 120_000);
        if (day >= goals[2].createdAt) move(EVERYDAY_ID, 'goal-laptop', 2_000_00, at + 180_000);
      });
    }
    if (dom === 3) on(time(day, 6, 7), at => card({ name: 'Netflix', min: 549, max: 549, online: true }, 'entertainment', at, 549_00, true));
    if (dom === 11) on(time(day, 6, 7), at => card({ name: 'Spotify', min: 149, max: 149, online: true }, 'entertainment', at, 149_00, true));
    if (dom === 8) on(time(day, 19, 21.5), at => bill('Globe Postpaid', 1_299_00, at));
    if (dom === 12) on(time(day, 19, 21.5), at => bill('PLDT Home', 1_699_00, at));
    if (dom === 20) on(time(day, 19, 21.5), at => bill('Meralco', price({ min: 2600, max: 3900 }, true), at));
    if (dom === 23) on(time(day, 18, 21), at => bill('Maynilad', price({ min: 420, max: 690 }, true), at));

    if (!weekend) {
      if (chance(0.25)) on(time(day, 7.5, 9.5), at => card(one(COFFEE), 'dining', at));
      if (chance(0.3)) on(time(day, 7, 8.75), at => card({ name: 'Grab', min: 160, max: 520, online: true }, 'transport', at));
      if (chance(0.6)) on(time(day, 11.75, 13.5), at => card(one(LUNCH), 'dining', at));
      if (chance(0.25)) on(time(day, 18, 20), at => card({ name: 'Grab', min: 180, max: 520, online: true }, 'transport', at));
      if (chance(0.15)) on(time(day, 19, 21), at => card(one(DELIVERY), 'dining', at));
      if (chance(0.08)) on(time(day, 8, 19), at => card({ name: 'Angkas', min: 90, max: 260, online: true }, 'transport', at));
    } else {
      if (chance(0.8)) on(time(day, 12, 20), at => card(one(DINE_OUT), 'dining', at));
      if (dow === 6 && chance(0.8)) on(time(day, 10, 17), at => card(one(GROCERY), 'groceries', at));
      if (chance(0.18)) on(time(day, 14, 21), at => card({ name: 'SM Cinema', min: 350, max: 900 }, 'entertainment', at));
    }
    if (dow === 3 && chance(0.25)) on(time(day, 18, 21), at => card(one(TOP_UP), 'groceries', at));
    if (chance(0.07)) on(time(day, 9, 22), at => card(one(SHOPS), 'shopping', at));
    if (chance(0.04)) on(time(day, 9, 21), at => card(one(PHARMACY), 'health', at));
    if (chance(0.015)) on(time(day, 20, 23), at => card({ name: 'Steam', min: 300, max: 1500, online: true }, 'entertainment', at));
    if (chance(0.04)) on(time(day, 7, 20), at => card({ name: 'Beep Card Reload', min: 200, max: 500 }, 'transport', at));
    if (chance(0.04)) {
      on(time(day, 10, 21), at => {
        const amount = Math.round(between(2, 10)) * 500_00;
        if (bal[EVERYDAY_ID] - amount < BUFFER) return;
        add({ holder: EVERYDAY_ID, amount: -amount, at, title: 'ATM withdrawal', category: 'cash', kind: 'atm', card: 'card-debit' });
      });
    }
    if (chance(0.05)) {
      on(time(day, 9, 22), at => {
        const friend = one(recipients.slice(0, FRIENDS.length));
        const amount = Math.round(between(3, 25)) * 100_00 + (chance(0.4) ? 50_00 : 0);
        if (bal[EVERYDAY_ID] - amount < BUFFER) return;
        add({ holder: EVERYDAY_ID, amount: -amount, at, title: friend.name, category: 'transfers', kind: 'transfer', method: 'instapay', note: one(OUT_NOTES), party: partyOf(friend) });
      });
    }
    if (chance(0.03)) {
      on(time(day, 9, 22), at => {
        const friend = one(recipients.slice(0, FRIENDS.length));
        add({ holder: EVERYDAY_ID, amount: Math.round(between(250, 1800) / 50) * 50_00, at, title: friend.name, category: 'income', kind: 'transfer', note: one(IN_NOTES), party: partyOf(friend) });
      });
    }
    // One weekend away, about six weeks into the history.
    if (day === startOfDay(start + 45 * DAY)) {
      on(time(day, 21, 22), at => card({ name: 'Cebu Pacific', min: 0, max: 0, online: true }, 'travel', at, 7_840_00, true));
      on(time(day, 22, 23), at => card({ name: 'Agoda', min: 0, max: 0, online: true }, 'travel', at, 5_960_00, true));
    }

    events.sort((a, b) => a.at - b.at).forEach(e => e.run(e.at));
  }

  return {
    owner: { name, since: start },
    accounts,
    goals,
    txns: txns.sort((a, b) => b.at - a.at),
    cards,
    recipients,
    billers: [
      { id: newId(), biller: 'meralco', ref: randomDigits(10) },
      { id: newId(), biller: 'pldt', ref: randomDigits(10) },
      { id: newId(), biller: 'globe', ref: '0917' + randomDigits(7) },
      { id: newId(), biller: 'maynilad', ref: randomDigits(8) },
    ],
    budgets: { dining: 12_000_00, groceries: 10_000_00, transport: 5_000_00, shopping: 3_000_00, entertainment: 2_000_00 },
  };
}
