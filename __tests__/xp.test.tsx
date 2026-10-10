/// <reference types="jest" />
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() } }));
jest.mock('@/config', () => ({ AI_FEATURES: false, PAYWALL: false, COACHING: false }));

import TodayScreen from '@/app/(tabs)/index';
import LevelsScreen from '@/app/levels';
import { FOOD } from '@/lib/foods';
import { computeTargets, type Profile } from '@/lib/nutrition';
import { addEntries, addWater, hydrate, readState, saveProfile, todayStr, toggleWorkout, type AppState, type Entry } from '@/lib/store';
import { XP, dayChecklist, earned, levelFor, stepXp, titleFor, totalXp } from '@/lib/xp';

const profile: Profile = { sex: 'm', age: 28, heightCm: 178, weightKg: 75, activity: 1.55, goal: 'cut', pace: 'standard', diet: 'any', cutoffs: 'who', units: 'metric' };
const T = computeTargets(profile);
const entry = (slot: Entry['slot'], kcal: number, protein: number): Entry =>
  ({ id: `${slot}${kcal}`, fid: 'x', name: 'x', unit: { kind: 'custom', label: '1' }, n: [kcal, protein], s: 1, slot });
const base = (): Pick<AppState, 'profile' | 'logs' | 'water' | 'weights' | 'bodyChecks' | 'training'> =>
  ({ profile, logs: {}, water: {}, weights: [], bodyChecks: [], training: { days: 3, equipment: 'gym', week: '', done: [], history: [] } });

describe('levels', () => {
  it('needs 100 XP for level 2, then 50 more each level', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0, needed: 100, title: 'Rookie' });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toMatchObject({ level: 2, into: 0, needed: 150, title: 'Starter' });
    expect(levelFor(250).level).toBe(3);
    expect(stepXp(10)).toBe(550);
    expect(levelFor(2700).level).toBe(10);
  });
  it('has titles that change at set levels', () => {
    expect(titleFor(4)).toBe('Regular');
    expect(titleFor(5)).toBe('Committed');
    expect(titleFor(31)).toBe('Legend');
    expect(levelFor(0)).toMatchObject({ nextTitle: 'Starter', nextTitleAt: 2 });
  });
});

describe('daily XP', () => {
  it('rewards logging, meals, targets, water and weigh-ins', () => {
    const s = base();
    const d = '2026-10-06';
    s.logs[d] = [entry('breakfast', T.kcal * 0.5, T.protein * 0.6), entry('dinner', T.kcal * 0.45, T.protein * 0.5)];
    s.water[d] = 4000;
    s.weights = [{ d, kg: 75 }];
    const items = dayChecklist(s, d);
    const done = items.filter(i => i.done).map(i => i.key);
    expect(done).toEqual(['food', 'meal:breakfast', 'meal:dinner', 'calories', 'protein', 'water', 'weigh']);
    expect(earned(items)).toBe(XP.foodDay + 2 * XP.meal + XP.calories + XP.protein + XP.water + XP.weighIn);
  });

  it('gives no calorie XP when far off target, and a streak bonus from day 7', () => {
    const s = base();
    for (let i = 1; i <= 7; i++) s.logs[`2026-10-0${i}`] = [entry('lunch', 300, 10)];
    expect(dayChecklist(s, '2026-10-06').some(i => i.key === 'streak')).toBe(false);
    const day7 = dayChecklist(s, '2026-10-07');
    expect(day7.find(i => i.key === 'calories')!.done).toBe(false);
    expect(day7.find(i => i.key === 'streak')!.done).toBe(true);
  });

  it('adds workouts and body checks to the total', () => {
    const s = base();
    s.training.history = ['2026-09-28:d1', '2026-10-05:d1', '2026-10-05:d1'];
    s.bodyChecks = [{ id: 'b', d: '2026-10-01', summary: '', groups: [], focus: [], balance: '', views: [] }];
    expect(totalXp(s)).toEqual({ total: 2 * XP.workout + XP.bodyCheck, days: 0, workouts: 2 * XP.workout, bodyChecks: XP.bodyCheck });
  });
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

test('Today shows the level card and celebrates a level-up once', async () => {
  await hydrate();
  saveProfile(profile);
  const view = await render(wrap(<TodayScreen />));
  // First run: the current level is recorded without a celebration.
  expect(readState().seenLevel).toBe(1);
  expect(screen.getByText('Level 1 · Rookie')).toBeTruthy();
  // Saving the profile logs today's weight: +5.
  expect(screen.getByText('+5')).toBeTruthy();

  await act(async () => {
    const egg = FOOD.egg;
    addEntries(todayStr(), (['breakfast', 'lunch', 'dinner', 'snacks'] as const).map(slot => ({ fid: egg.id, name: egg.name, unit: egg.unit, n: egg.n.slice(), s: 1, slot })));
    addWater(todayStr(), 5000);
    toggleWorkout('d1');
  });
  await view.rerender(wrap(<TodayScreen />));
  // Today: 5 weigh-in + 10 food + 4 meals × 5 + 10 water = 45, plus 30 for the workout = 75 XP.
  // One more workout crosses 100.
  expect(screen.getByText('+45')).toBeTruthy();
  expect(screen.getByText('Level 1 · Rookie')).toBeTruthy();
  await act(async () => { toggleWorkout('d2'); });
  await view.rerender(wrap(<TodayScreen />));
  expect(screen.getByText('LEVEL UP')).toBeTruthy();
  expect(screen.getByText(/New title: Starter!/)).toBeTruthy();
  await fireEvent.press(screen.getByText('Let’s go'));
  expect(readState().seenLevel).toBe(2);
  expect(screen.queryByText('LEVEL UP')).toBeNull();
  expect(screen.getByText('Level 2 · Starter')).toBeTruthy();
});

test('Levels screen lists today’s checklist and titles', async () => {
  await hydrate();
  const info = levelFor(totalXp(readState()).total);
  await render(wrap(<LevelsScreen />));
  expect(screen.getAllByText(info.title).length).toBe(2); // current title, and in the title list
  expect(screen.getByText('Current')).toBeTruthy();
  expect(screen.getByText('Earn XP today')).toBeTruthy();
  expect(screen.getByText('Log breakfast')).toBeTruthy();
  expect(screen.getByText(new RegExp(`Reach level ${info.nextTitleAt} to become ${info.nextTitle}`))).toBeTruthy();
  expect(screen.getAllByText('Locked').length).toBeGreaterThan(3);
});
