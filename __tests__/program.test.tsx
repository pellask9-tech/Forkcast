/// <reference types="jest" />
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() } }));

import ProgramScreen from '@/app/program';
import { buildProgram, weekKey } from '@/lib/program';
import { hydrate, readState, saveBodyCheck, saveProfile, type BodyCheck } from '@/lib/store';

const check: Pick<BodyCheck, 'groups' | 'focus'> = {
  groups: [
    { id: 'shoulders', name: 'Shoulders', status: 'needs_work', note: 'Smaller than chest.' },
    { id: 'chest', name: 'Chest', status: 'strong', note: '' },
    { id: 'arms', name: 'Arms', status: 'on_track', note: '' },
    { id: 'back', name: 'Back', status: 'not_visible', note: '' },
    { id: 'core', name: 'Core', status: 'on_track', note: '' },
    { id: 'glutes', name: 'Glutes', status: 'not_visible', note: '' },
    { id: 'quads', name: 'Quads', status: 'needs_work', note: 'Lighter than upper body.' },
    { id: 'hamstrings', name: 'Hamstrings', status: 'not_visible', note: '' },
    { id: 'calves', name: 'Calves', status: 'on_track', note: '' },
  ],
  focus: [{ group: 'quads', why: 'Balance.', exercises: [{ name: 'Goblet squats', sets: '4 × 10' }] }],
};

describe('buildProgram', () => {
  it('gives a balanced program without a body check', () => {
    const p = buildProgram({ check: null, goal: 'bulk', days: 4, equipment: 'gym' });
    expect(p.personalised).toBe(false);
    expect(p.days).toHaveLength(4);
    expect(p.priority).toEqual([]);
    for (const d of p.days) for (const e of d.exercises) expect(e.sets.startsWith('3 × ')).toBe(true);
  });

  it('puts "train more" muscles first, with extra volume, and keeps strong points at maintenance', () => {
    const p = buildProgram({ check, goal: 'bulk', days: 4, equipment: 'gym' });
    // The body check's focus order comes first.
    expect(p.priority).toEqual(['quads', 'shoulders']);
    expect(p.maintain).toEqual(['chest']);
    const upper = p.days[0];
    expect(upper.exercises[0].group).toBe('shoulders');
    expect(upper.exercises.filter(e => e.group === 'shoulders')).toHaveLength(2);
    expect(upper.exercises.find(e => e.group === 'shoulders')!.sets.startsWith('4 × ')).toBe(true);
    expect(upper.exercises.find(e => e.group === 'chest')!.sets.startsWith('2 × ')).toBe(true);
    // The body check's own exercise suggestion is used first.
    expect(p.days[1].exercises[0].name).toBe('Goblet squats');
  });

  it('keeps sessions to 7 exercises at most, in every split', () => {
    const allWeak = { groups: check.groups.map(g => ({ ...g, status: 'needs_work' as const })), focus: [] };
    for (const days of [3, 4, 5] as const) {
      for (const d of buildProgram({ check: allWeak, goal: 'cut', days, equipment: 'home' }).days) {
        expect(d.exercises.length).toBeLessThanOrEqual(7);
        expect(new Set(d.exercises.map(e => e.name)).size).toBe(d.exercises.length);
      }
    }
  });

  it('adds cardio for cutting and uses no machines at home', () => {
    const cut = buildProgram({ check: null, goal: 'cut', days: 3, equipment: 'home' });
    expect(cut.days.every(d => d.finisher?.includes('walk'))).toBe(true);
    const names = cut.days.flatMap(d => d.exercises.map(e => e.name)).join(' ');
    expect(names).not.toMatch(/pulldown|cable|machine|leg press/i);
    const bulk = buildProgram({ check: null, goal: 'bulk', days: 3, equipment: 'gym' });
    expect(bulk.days.filter(d => d.finisher)).toHaveLength(1);
  });
});

describe('weekKey', () => {
  it('returns the Monday of the week', () => {
    expect(weekKey(new Date(2026, 9, 6))).toBe('2026-10-05'); // Tuesday
    expect(weekKey(new Date(2026, 9, 11))).toBe('2026-10-05'); // Sunday
    expect(weekKey(new Date(2026, 9, 5))).toBe('2026-10-05'); // Monday
  });
});

test('Program screen shows the plan and ticks off a session', async () => {
  await hydrate();
  saveProfile({ sex: 'm', age: 28, heightCm: 178, weightKg: 75, activity: 1.55, goal: 'bulk', pace: 'standard', diet: 'any', cutoffs: 'who', units: 'metric' });
  saveBodyCheck({ summary: 'Good base.', groups: check.groups, focus: check.focus, balance: '', views: ['front'] });
  const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
  await render(<SafeAreaProvider initialMetrics={metrics}><ProgramScreen /></SafeAreaProvider>);

  expect(screen.getByText('Your weekly program')).toBeTruthy();
  expect(screen.getByText('0 of 3 done')).toBeTruthy();
  await fireEvent.press(screen.getAllByText('Mark as done')[0]);
  expect(screen.getByText('1 of 3 done')).toBeTruthy();
  expect(readState().training.done).toEqual(['d1']);

  await fireEvent.press(screen.getByText('5 days'));
  expect(screen.getByText('0 of 5 done')).toBeTruthy();
  await act(async () => {});
});
