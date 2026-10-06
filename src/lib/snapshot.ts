/**
 * What a member shares with their coach. Only summaries leave the phone: daily totals (not the
 * individual foods), weights, body check results (never the photos) and program progress.
 * Shared only while the member has an active coach.
 */
import { computeTargets } from './nutrition';
import { weekKey } from './program';
import type { AppState, BodyCheck, Entry } from './store';

export const SNAPSHOT_DAYS = 14;

export interface SnapshotDay { d: string; kcal: number; p: number; c: number; f: number; items: number }
export interface ClientSnapshot {
  v: 1;
  updatedAt: string;
  profile: {
    sex: 'm' | 'f'; age: number; heightCm: number; weightKg: number; units: 'metric' | 'imperial';
    goal: 'cut' | 'bulk'; mode: 'cut' | 'bulk' | 'maintain'; bmi: number; bmiLabel: string;
  };
  targets: { kcal: number; protein: number; carbs: number; fat: number };
  days: SnapshotDay[];
  weights: { d: string; kg: number }[];
  bodyCheck: Pick<BodyCheck, 'd' | 'summary' | 'groups' | 'focus' | 'balance'> | null;
  training: { daysPerWeek: number; equipment: string; doneThisWeek: number };
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const r1 = (x: number) => Math.round(x * 10) / 10;

function dayTotals(entries: Entry[]) {
  const t = [0, 0, 0, 0];
  for (const e of entries) for (let i = 0; i < 4; i++) t[i] += (e.n[i] || 0) * e.s;
  return t;
}

export function buildSnapshot(state: Pick<AppState, 'profile' | 'logs' | 'weights' | 'bodyChecks' | 'training'>, now = new Date()): ClientSnapshot | null {
  const p = state.profile;
  if (!p) return null;
  const T = computeTargets(p);

  const days: SnapshotDay[] = [];
  for (let i = SNAPSHOT_DAYS - 1; i >= 0; i--) {
    const d = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
    const entries = state.logs[d] ?? [];
    const [kcal, pr, c, f] = dayTotals(entries);
    days.push({ d, kcal: Math.round(kcal), p: r1(pr), c: r1(c), f: r1(f), items: entries.length });
  }

  const check = state.bodyChecks[state.bodyChecks.length - 1];
  const t = state.training;
  return {
    v: 1,
    updatedAt: now.toISOString(),
    profile: {
      sex: p.sex, age: p.age, heightCm: Math.round(p.heightCm), weightKg: r1(p.weightKg), units: p.units,
      goal: p.goal, mode: T.mode, bmi: r1(T.bmi), bmiLabel: T.info.label,
    },
    targets: { kcal: T.kcal, protein: T.protein, carbs: T.carbs, fat: T.fat },
    days,
    weights: state.weights.slice(-30),
    bodyCheck: check ? { d: check.d, summary: check.summary, groups: check.groups, focus: check.focus, balance: check.balance } : null,
    training: { daysPerWeek: t.days, equipment: t.equipment, doneThisWeek: t.week === weekKey(now) ? t.done.length : 0 },
  };
}

/** Averages over the days the member actually logged food. */
export function snapshotAverages(s: ClientSnapshot, lastDays = 7) {
  const logged = s.days.slice(-lastDays).filter(d => d.items > 0);
  const avg = (k: 'kcal' | 'p') => (logged.length ? logged.reduce((a, d) => a + d[k], 0) / logged.length : 0);
  return { loggedDays: logged.length, of: Math.min(lastDays, s.days.length), kcal: Math.round(avg('kcal')), protein: Math.round(avg('p')) };
}
