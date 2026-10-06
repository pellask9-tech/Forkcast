/**
 * App state, saved on the device with AsyncStorage.
 * Screens read it with useAppState() and change it with the action functions below.
 * To add cloud sync later (e.g. Supabase), mirror the same keys to your backend inside persist*().
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { Food, Unit } from './foods';
import type { Profile } from './nutrition';
import { weekKey, type DaysPerWeek, type Equipment } from './program';

export type SlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export const SLOTS: [SlotKey, string][] = [
  ['breakfast', 'Breakfast'],
  ['lunch', 'Lunch'],
  ['dinner', 'Dinner'],
  ['snacks', 'Snacks'],
];
export const slotLabel = (k: SlotKey) => SLOTS.find(s => s[0] === k)?.[1] ?? k;

export interface Entry {
  id: string;
  fid: string;
  name: string;
  unit: Unit;
  /** nutrients for one serving */
  n: number[];
  /** servings eaten */
  s: number;
  slot: SlotKey;
  via?: 'photo' | 'plan' | 'search';
}
export interface Weight { d: string; kg: number }

export type MuscleStatus = 'strong' | 'on_track' | 'needs_work' | 'not_visible';
export interface MuscleGroup { id: string; name: string; status: MuscleStatus; note: string }
export interface FocusArea { group: string; why: string; exercises: { name: string; sets: string }[] }
export interface BodyCheck {
  id: string;
  d: string;
  summary: string;
  groups: MuscleGroup[];
  focus: FocusArea[];
  balance: string;
  views: string[];
}

export interface AppState {
  ready: boolean;
  profile: Profile | null;
  customFoods: Food[];
  weights: Weight[];
  picks: Record<string, string> | null;
  logs: Record<string, Entry[]>;
  pro: boolean;
  proPlan: string | null;
  scanDay: string;
  scanCount: number;
  /** ml of water per day */
  water: Record<string, number>;
  bodyChecks: BodyCheck[];
  training: Training;
  /** The highest level the user has already been shown. 0 until the app first works it out. */
  seenLevel: number;
}

/** Weekly program settings and the sessions ticked off in the current week. */
export interface Training {
  days: DaysPerWeek;
  equipment: Equipment;
  week: string;
  done: string[];
  /** Every session ever ticked, as "week:dayId". Kept across weeks for XP. */
  history: string[];
}
const DEFAULT_TRAINING: Training = { days: 3, equipment: 'gym', week: '', done: [], history: [] };

const PREFIX = 'forkcast:v1:';
let state: AppState = {
  ready: false, profile: null, customFoods: [], weights: [], picks: null, logs: {},
  pro: false, proPlan: null, scanDay: '', scanCount: 0, water: {}, bodyChecks: [], training: DEFAULT_TRAINING, seenLevel: 0,
};
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getState = () => state;
function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}
export const readState = getState;
/** Listen for any state change (used to keep a coach's view of your progress fresh). */
export const subscribeState = subscribe;

/* ---------------- Dates ---------------- */
export function dstr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function parseD(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function shiftD(s: string, n: number) { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); }
export const todayStr = () => dstr(new Date());
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export function defaultSlot(): SlotKey {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snacks' : 'dinner';
}

/* ---------------- Persistence ---------------- */
const save = (key: string, value: unknown) => { AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {}); };
const persistProfile = () => save('profile', { profile: state.profile, customFoods: state.customFoods, weights: state.weights, picks: state.picks });
const persistMeta = () => save('meta', { pro: state.pro, proPlan: state.proPlan, scanDay: state.scanDay, scanCount: state.scanCount, seenLevel: state.seenLevel });
const persistLog = (date: string) => save('log:' + date, state.logs[date] ?? []);
const persistWater = () => save('water', state.water);
const persistBody = () => save('body', state.bodyChecks);
const persistTraining = () => save('training', state.training);

export async function hydrate() {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PREFIX));
    const pairs = await AsyncStorage.multiGet(keys);
    const patch: Partial<AppState> = { logs: {} };
    for (const [key, raw] of pairs) {
      if (!raw) continue;
      let v: any;
      try { v = JSON.parse(raw); } catch { continue; }
      const k = key.slice(PREFIX.length);
      if (k === 'profile') {
        patch.profile = v.profile ?? null;
        patch.customFoods = Array.isArray(v.customFoods) ? v.customFoods : [];
        patch.weights = Array.isArray(v.weights) ? v.weights : [];
        patch.picks = v.picks ?? null;
      } else if (k === 'meta') {
        patch.pro = !!v.pro;
        patch.proPlan = v.proPlan ?? null;
        patch.scanDay = v.scanDay ?? '';
        patch.scanCount = v.scanCount ?? 0;
        patch.seenLevel = Number(v.seenLevel) || 0;
      } else if (k === 'water' && v && typeof v === 'object') {
        patch.water = v;
      } else if (k === 'body' && Array.isArray(v)) {
        patch.bodyChecks = v;
      } else if (k === 'training' && v && typeof v === 'object') {
        patch.training = {
          ...DEFAULT_TRAINING, ...v,
          done: Array.isArray(v.done) ? v.done : [],
          history: Array.isArray(v.history) ? v.history : [],
        };
      } else if (k.startsWith('log:') && Array.isArray(v)) {
        patch.logs![k.slice(4)] = v;
      }
    }
    set({ ...patch, ready: true });
  } catch {
    set({ ready: true });
  }
}

/* ---------------- Actions ---------------- */
export function saveProfile(profile: Profile) {
  const weights = state.weights.length ? state.weights : [{ d: todayStr(), kg: Math.round(profile.weightKg * 10) / 10 }];
  set({ profile, weights });
  persistProfile();
}

export function setPicks(picks: Record<string, string> | null) {
  set({ picks });
  persistProfile();
}

export function addEntries(date: string, entries: Omit<Entry, 'id'>[]) {
  const list = [...(state.logs[date] ?? []), ...entries.map(e => ({ ...e, id: uid() }))];
  set({ logs: { ...state.logs, [date]: list } });
  persistLog(date);
}

export function removeEntry(date: string, id: string) {
  const list = (state.logs[date] ?? []).filter(e => e.id !== id);
  set({ logs: { ...state.logs, [date]: list } });
  persistLog(date);
}

export function addCustomFood(f: Food) {
  set({ customFoods: [...state.customFoods, f] });
  persistProfile();
}

export function logWeight(kg: number) {
  if (!state.profile) return;
  const d = todayStr();
  const weights = [...state.weights.filter(w => w.d !== d), { d, kg: Math.round(kg * 10) / 10 }]
    .sort((a, b) => (a.d < b.d ? -1 : 1))
    .slice(-365);
  set({ weights, profile: { ...state.profile, weightKg: kg } });
  persistProfile();
}

export function setPro(pro: boolean, plan: string | null) {
  set({ pro, proPlan: plan });
  persistMeta();
}

export function setSeenLevel(level: number) {
  set({ seenLevel: level });
  persistMeta();
}

export function scansUsedToday() {
  return state.scanDay === todayStr() ? state.scanCount : 0;
}
export function recordScan() {
  const d = todayStr();
  set({ scanDay: d, scanCount: (state.scanDay === d ? state.scanCount : 0) + 1 });
  persistMeta();
}

/* ---------------- Water ---------------- */
export const GLASS_ML = 250;
/** About 35 ml per kg of body weight, rounded to whole glasses, between 2 and 4 litres. */
export function waterGoal(weightKg: number | undefined) {
  const ml = (weightKg ?? 70) * 35;
  return Math.min(4000, Math.max(2000, Math.round(ml / GLASS_ML) * GLASS_ML));
}
export function addWater(date: string, ml: number) {
  const next = Math.max(0, Math.min(8000, (state.water[date] ?? 0) + ml));
  set({ water: { ...state.water, [date]: next } });
  persistWater();
}

/* ---------------- Streak ---------------- */
/** Days in a row with at least one food logged, counting back from today (or yesterday if today is empty so far). */
export function logStreak(logs: Record<string, Entry[]>) {
  let d = todayStr();
  if (!(logs[d]?.length)) d = shiftD(d, -1);
  let n = 0;
  while (logs[d]?.length) {
    n++;
    d = shiftD(d, -1);
  }
  return n;
}

/* ---------------- Body checks ---------------- */
export function saveBodyCheck(c: Omit<BodyCheck, 'id' | 'd'>) {
  const check: BodyCheck = { ...c, id: uid(), d: todayStr() };
  set({ bodyChecks: [...state.bodyChecks, check].slice(-20) });
  persistBody();
  return check;
}
export function deleteBodyCheck(id: string) {
  set({ bodyChecks: state.bodyChecks.filter(b => b.id !== id) });
  persistBody();
}

/* ---------------- Training ---------------- */
export function setTrainingPrefs(patch: Partial<Pick<Training, 'days' | 'equipment'>>) {
  // Changing the plan changes which sessions exist, so this week's ticks start over.
  set({ training: { ...state.training, ...patch, week: weekKey(new Date()), done: [] } });
  persistTraining();
}

/** Sessions done this week. Ticks from an earlier week don't count. */
export function doneThisWeek(t: Training): string[] {
  return t.week === weekKey(new Date()) ? t.done : [];
}

export function toggleWorkout(dayId: string) {
  const week = weekKey(new Date());
  const done = doneThisWeek(state.training);
  const key = `${week}:${dayId}`;
  const ticking = !done.includes(dayId);
  const next = ticking ? [...done, dayId] : done.filter(d => d !== dayId);
  const history = ticking ? [...new Set([...state.training.history, key])] : state.training.history.filter(h => h !== key);
  set({ training: { ...state.training, week, done: next, history: history.slice(-1000) } });
  persistTraining();
}
