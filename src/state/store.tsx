import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useMemo, useReducer, type ReactNode } from 'react';

import { findFood, nutrientsFor } from '@/lib/foods';
import { MEAL_SLOTS, type MealSlot } from '@/lib/mealPlan';
import { emptyNutrients, sumNutrients, type Nutrients } from '@/lib/nutrients';
import type { Profile } from '@/lib/nutrition';

export type LogEntry = {
  id: string;
  foodId: string;
  grams: number;
  slot: MealSlot;
  loggedAt: number;
};

type State = {
  hydrated: boolean;
  profile: Profile | null;
  /** Entries keyed by local date, `YYYY-MM-DD`. */
  logs: Record<string, LogEntry[]>;
};

type Action =
  | { type: 'hydrate'; state: Pick<State, 'profile' | 'logs'> }
  | { type: 'setProfile'; profile: Profile }
  | { type: 'addEntries'; date: string; entries: Omit<LogEntry, 'id' | 'loggedAt'>[] }
  | { type: 'removeEntry'; date: string; id: string }
  | { type: 'reset' };

const STORAGE_KEY = 'forkcast/state/v1';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { hydrated: true, ...action.state };
    case 'setProfile':
      return { ...state, profile: action.profile };
    case 'addEntries': {
      const now = Date.now();
      const added = action.entries.map((e) => ({ ...e, id: newId(), loggedAt: now }));
      return { ...state, logs: { ...state.logs, [action.date]: [...(state.logs[action.date] ?? []), ...added] } };
    }
    case 'removeEntry':
      return {
        ...state,
        logs: { ...state.logs, [action.date]: (state.logs[action.date] ?? []).filter((e) => e.id !== action.id) },
      };
    case 'reset':
      return { hydrated: true, profile: null, logs: {} };
  }
}

const StoreContext = createContext<{ state: State; dispatch: (a: Action) => void } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { hydrated: false, profile: null, logs: {} });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : {};
        dispatch({ type: 'hydrate', state: { profile: saved.profile ?? null, logs: saved.logs ?? {} } });
      })
      .catch(() => dispatch({ type: 'hydrate', state: { profile: null, logs: {} } }));
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: state.profile, logs: state.logs })).catch(() => {
      // Storage can be unavailable (e.g. private browsing on web); the app keeps working in memory.
    });
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore() {
  const ctx = use(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

/** The saved profile. Only call from screens behind the onboarding guard. */
export function useProfile(): Profile {
  const { state } = useStore();
  if (!state.profile) throw new Error('No profile yet');
  return state.profile;
}

export function entryNutrients(entry: LogEntry): Nutrients {
  // Ignore entries whose food was removed from the database in a later version.
  return findFood(entry.foodId) ? nutrientsFor(entry.foodId, entry.grams) : emptyNutrients();
}

export function useDayLog(date: string) {
  const { state, dispatch } = useStore();
  const entries = useMemo(() => state.logs[date] ?? [], [state.logs, date]);

  return useMemo(() => {
    const bySlot = Object.fromEntries(
      MEAL_SLOTS.map(({ id }) => [id, sumNutrients(entries.filter((e) => e.slot === id).map(entryNutrients))]),
    ) as Record<MealSlot, Nutrients>;
    const totals = sumNutrients(entries.map(entryNutrients));
    return {
      entries,
      bySlot,
      totals,
      add: (items: { foodId: string; grams: number; slot: MealSlot }[]) =>
        dispatch({ type: 'addEntries', date, entries: items }),
      remove: (id: string) => dispatch({ type: 'removeEntry', date, id }),
    };
  }, [entries, date, dispatch]);
}

/** Local calendar date as `YYYY-MM-DD`. */
export function dateKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

export function formatDateKey(key: string): string {
  const today = dateKey();
  if (key === today) return 'Today';
  if (key === shiftDateKey(today, -1)) return 'Yesterday';
  if (key === shiftDateKey(today, 1)) return 'Tomorrow';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Stable whole-number seed for a date, used to rotate daily recommendations. */
export function daySeed(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}
