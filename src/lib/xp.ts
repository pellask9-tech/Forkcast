/**
 * Levels & XP. XP is worked out from what's already saved (food logs, water, workouts, body
 * checks, weigh-ins), so it can't be double counted and existing users start with the XP they've
 * already earned. Daily targets use the current profile.
 *
 * No React Native imports, so this is easy to test.
 */
import { computeTargets, type Targets } from './nutrition';
import { waterGoal, type AppState, type Entry } from './store';

export const XP = {
  foodDay: 10,
  meal: 5,
  calories: 20,
  protein: 15,
  water: 10,
  workout: 30,
  bodyCheck: 50,
  weighIn: 5,
  streak: 10,
} as const;

/** A streak this long or longer earns the daily streak bonus. */
export const STREAK_BONUS_DAYS = 7;
const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;

export const TITLES: [level: number, title: string][] = [
  [1, 'Rookie'], [2, 'Starter'], [3, 'Regular'], [5, 'Committed'], [8, 'Dedicated'],
  [12, 'Athlete'], [16, 'Pro'], [20, 'Elite'], [30, 'Legend'],
];
export const titleFor = (level: number) => [...TITLES].reverse().find(([l]) => level >= l)![1];

/** XP needed to go from `level` to the next one: 100, 150, 200, … */
export const stepXp = (level: number) => 100 + 50 * (level - 1);

export interface LevelInfo { level: number; title: string; xp: number; into: number; needed: number; nextTitle: string | null; nextTitleAt: number | null }
export function levelFor(xp: number): LevelInfo {
  let level = 1;
  let floor = 0;
  while (xp >= floor + stepXp(level)) {
    floor += stepXp(level);
    level++;
  }
  const next = TITLES.find(([l]) => l > level);
  return { level, title: titleFor(level), xp, into: xp - floor, needed: stepXp(level), nextTitle: next?.[1] ?? null, nextTitleAt: next?.[0] ?? null };
}

type XpState = Pick<AppState, 'profile' | 'logs' | 'water' | 'weights' | 'bodyChecks' | 'training'>;
export interface XpItem { key: string; label: string; xp: number; done: boolean }

const ymdShift = (d: string, n: number) => {
  const [y, m, day] = d.split('-').map(Number);
  const x = new Date(y, m - 1, day + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const totals = (entries: Entry[]) => entries.reduce((t, e) => [t[0] + (e.n[0] || 0) * e.s, t[1] + (e.n[1] || 0) * e.s], [0, 0]);

/** Days in a row with food logged, ending on `d`. */
function streakEndingOn(logs: XpState['logs'], d: string) {
  let n = 0;
  while (logs[d]?.length) { n++; d = ymdShift(d, -1); }
  return n;
}

/** Everything that can earn XP on one day, done or not. */
export function dayChecklist(state: XpState, d: string, T: Targets | null = state.profile ? computeTargets(state.profile) : null): XpItem[] {
  const entries = state.logs[d] ?? [];
  const [kcal, protein] = totals(entries);
  const logged = entries.length > 0;
  const items: XpItem[] = [
    { key: 'food', label: 'Log any food', xp: XP.foodDay, done: logged },
    ...MEAL_SLOTS.map(slot => ({
      key: `meal:${slot}`,
      label: `Log ${slot === 'snacks' ? 'a snack' : slot}`,
      xp: XP.meal,
      done: entries.some(e => e.slot === slot),
    })),
  ];
  if (T) {
    items.push({ key: 'calories', label: `Land within 10% of ${Math.round(T.kcal).toLocaleString('en-US')} kcal`, xp: XP.calories, done: logged && Math.abs(kcal - T.kcal) <= T.kcal * 0.1 });
    items.push({ key: 'protein', label: `Eat ${Math.round(T.protein)} g protein`, xp: XP.protein, done: protein >= T.protein });
  }
  items.push({ key: 'water', label: 'Hit your water goal', xp: XP.water, done: (state.water[d] ?? 0) >= waterGoal(state.profile?.weightKg) });
  items.push({ key: 'weigh', label: 'Log your weight', xp: XP.weighIn, done: state.weights.some(w => w.d === d) });
  if (logged && streakEndingOn(state.logs, d) >= STREAK_BONUS_DAYS) {
    items.push({ key: 'streak', label: `${STREAK_BONUS_DAYS}+ day streak bonus`, xp: XP.streak, done: true });
  }
  return items;
}

export const earned = (items: XpItem[]) => items.reduce((a, i) => a + (i.done ? i.xp : 0), 0);

export interface XpSummary { total: number; days: number; workouts: number; bodyChecks: number }
export function totalXp(state: XpState): XpSummary {
  const T = state.profile ? computeTargets(state.profile) : null;
  const dates = new Set([...Object.keys(state.logs), ...Object.keys(state.water), ...state.weights.map(w => w.d)]);
  let days = 0;
  for (const d of dates) days += earned(dayChecklist(state, d, T));
  const workouts = new Set(state.training.history ?? []).size * XP.workout;
  const bodyChecks = state.bodyChecks.length * XP.bodyCheck;
  return { total: days + workouts + bodyChecks, days, workouts, bodyChecks };
}
