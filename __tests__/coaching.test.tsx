/// <reference types="jest" />
import { act, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react-native';
import { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const render = (ui: ReactElement) => rtlRender(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

const mockRouter = { push: jest.fn(), back: jest.fn(), navigate: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    get router() { return mockRouter; },
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});
jest.mock('@/config', () => ({ AI_FEATURES: true, PAYWALL: false, COACHING: true }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@/lib/supabase', () => ({ supabase: null }));

// A fake coaching backend. The real database rules are tested in supabase/tests.
const coach = {
  id: 'c1', name: 'Ana Cruz', headline: 'Strength & physique coach', bio: 'Ten years helping people get strong.',
  photo_url: null, specialties: ['Muscle gain', 'Fat loss'], years_experience: 10, location: 'Quezon City',
  certifications: [{ name: 'Certified Personal Trainer', issuer: 'NASM', year: 2016 }],
  awards: [{ title: '1st place, Men’s Physique', org: 'PFBF Nationals', year: 2023 }],
  accepting_clients: true, published: true, verified: true,
};
let mockMe: any;
const mockApi = {
  listCoaches: jest.fn(async () => [coach]),
  getCoach: jest.fn(async () => coach),
  requestCoach: jest.fn(async () => { mockMe = { ...mockMe, link: { id: 'l1', coach_id: 'c1', client_id: 'm1', status: 'pending' } }; }),
  refreshMyLink: jest.fn(async () => mockMe.link),
  listNotes: jest.fn(async () => [{ id: 'n1', coach_id: 'c1', client_id: 'm1', body: 'Add 20 g protein at breakfast.', created_at: new Date().toISOString() }]),
  leaveCoach: jest.fn(async () => {}),
  pushSnapshot: jest.fn(async () => true),
  myCoachProfile: jest.fn(async () => coach),
  myClients: jest.fn(async () => [
    { id: 'l1', coach_id: 'c1', client_id: 'm1', status: 'pending', message: 'Help me bulk', name: 'Ben' },
    { id: 'l2', coach_id: 'c1', client_id: 'm2', status: 'active', message: '', name: 'Cara' },
  ]),
  respondToRequest: jest.fn(async () => {}),
  saveCoachProfile: jest.fn(async () => {}),
  uploadCoachPhoto: jest.fn(),
  getClientSnapshot: jest.fn(),
  sendNote: jest.fn(async () => {}),
  endCoaching: jest.fn(async () => {}),
  signIn: jest.fn(async () => {}),
  signUp: jest.fn(async () => ({ needsConfirm: true })),
  signOut: jest.fn(),
  setRole: jest.fn(),
};
jest.mock('@/lib/coaching', () => {
  const actual = jest.requireActual('@/lib/coaching');
  // Look the fakes up when called: this factory runs before mockApi is defined.
  const names = ['listCoaches', 'getCoach', 'requestCoach', 'refreshMyLink', 'listNotes', 'leaveCoach', 'pushSnapshot', 'myCoachProfile',
    'myClients', 'respondToRequest', 'saveCoachProfile', 'uploadCoachPhoto', 'getClientSnapshot', 'sendNote', 'endCoaching', 'signIn', 'signUp', 'signOut', 'setRole'];
  const fakes = Object.fromEntries(names.map(n => [n, (...args: unknown[]) => (mockApi as any)[n](...args)]));
  return { ...actual, ...fakes, useCoaching: () => mockMe, readCoaching: () => mockMe };
});

import ClientScreen from '@/app/client/[id]';
import CoachProfileScreen from '@/app/coaches/[id]';
import CoachEditScreen from '@/app/coach-edit';
import CoachTab from '@/app/(tabs)/coach';
import AccountScreen from '@/app/account';
import { emptyCoachDraft, validateCoachDraft } from '@/lib/coaching';
import { buildSnapshot, snapshotAverages } from '@/lib/snapshot';
import type { AppState } from '@/lib/store';

const profile = { sex: 'f' as const, age: 30, heightCm: 165, weightKg: 62, activity: 1.55, goal: 'bulk' as const, pace: 'standard' as const, diet: 'any' as const, cutoffs: 'who' as const, units: 'metric' as const };

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

describe('buildSnapshot', () => {
  const now = new Date(2026, 9, 6, 12);
  const state: Pick<AppState, 'profile' | 'logs' | 'weights' | 'bodyChecks' | 'training' | 'water'> = {
    profile,
    water: {},
    logs: {
      '2026-10-06': [{ id: 'e1', fid: 'egg', name: 'Secret snack', unit: { kind: 'custom', label: '1' }, n: [500, 30, 40, 20], s: 2, slot: 'lunch' }],
      '2026-10-05': [{ id: 'e2', fid: 'egg', name: 'Egg', unit: { kind: 'custom', label: '1' }, n: [300, 20, 10, 10], s: 1, slot: 'breakfast' }],
      '2026-09-01': [{ id: 'old', fid: 'egg', name: 'Old', unit: { kind: 'custom', label: '1' }, n: [999, 0, 0, 0], s: 1, slot: 'lunch' }],
    },
    weights: [{ d: '2026-10-01', kg: 62.4 }],
    bodyChecks: [{ id: 'b', d: '2026-10-02', summary: 'Good base.', groups: [], focus: [], balance: '', views: ['front'] }],
    training: { days: 4, equipment: 'home', week: '2026-10-05', done: ['d1', 'd2'], history: [] },
  };

  it('shares daily totals for the last 14 days, not the foods themselves', () => {
    const s = buildSnapshot(state, now)!;
    expect(s.days).toHaveLength(14);
    expect(s.days[13]).toEqual({ d: '2026-10-06', kcal: 1000, p: 60, c: 80, f: 40, items: 1 });
    expect(s.days[12].kcal).toBe(300);
    expect(JSON.stringify(s)).not.toMatch(/Secret snack|Old/);
    expect(s.days.reduce((a, d) => a + d.kcal, 0)).toBe(1300);
  });

  it('includes targets, body check results without photos, and this week’s workouts', () => {
    const s = buildSnapshot(state, now)!;
    expect(s.profile.goal).toBe('bulk');
    expect(s.targets.kcal).toBeGreaterThan(1500);
    expect(s.bodyCheck).toEqual({ d: '2026-10-02', summary: 'Good base.', groups: [], focus: [], balance: '' });
    expect(s.training).toEqual({ daysPerWeek: 4, equipment: 'home', doneThisWeek: 2 });
    expect(buildSnapshot({ ...state, training: { ...state.training, week: '2026-09-28' } }, now)!.training.doneThisWeek).toBe(0);
  });

  it('averages only days with food logged', () => {
    expect(snapshotAverages(buildSnapshot(state, now)!)).toEqual({ loggedDays: 2, of: 7, kcal: 650, protein: 40 });
    expect(buildSnapshot({ ...state, profile: null }, now)).toBeNull();
  });
});

describe('validateCoachDraft', () => {
  const ok = { ...emptyCoachDraft('Ana Cruz'), headline: 'Strength coach' };
  it('accepts a complete profile', () => expect(validateCoachDraft({ ...ok, published: true })).toBeNull());
  it('explains what to fix', () => {
    expect(validateCoachDraft({ ...ok, name: 'A' })).toMatch(/name/);
    expect(validateCoachDraft({ ...ok, headline: '', published: true })).toMatch(/headline/);
    expect(validateCoachDraft({ ...ok, years_experience: 71 })).toMatch(/0 to 70/);
    expect(validateCoachDraft({ ...ok, certifications: [{ name: ' ', issuer: '', year: null }] })).toMatch(/certification needs a name/);
    expect(validateCoachDraft({ ...ok, awards: [{ title: 'Champion', org: '', year: 1800 }] })).toMatch(/years/);
  });
});

test('Signed out: Coach tab shows the directory and a way in', async () => {
  mockMe = { ready: true, userId: null, email: null, role: null, displayName: '', link: null };
  await render(<CoachTab />);
  await waitFor(() => expect(screen.getByText('Ana Cruz')).toBeTruthy());
  expect(screen.getByText('✓ Verified')).toBeTruthy();
  expect(screen.getByText('🏆 1st place, Men’s Physique, PFBF Nationals (2023)')).toBeTruthy();
  await fireEvent.press(screen.getByText('I’m a coach'));
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/account', params: { role: 'coach' } });
});

test('Member requests a coach after seeing what will be shared', async () => {
  mockMe = { ready: true, userId: 'm1', email: 'ben@example.com', role: 'member', displayName: 'Ben', link: null };
  mockParams = { id: 'c1' };
  const view = await render(<CoachProfileScreen />);
  await waitFor(() => expect(screen.getByText('Certified Personal Trainer')).toBeTruthy());
  expect(screen.getByText(/never your photos/)).toBeTruthy();
  expect(screen.getByText('The Forkcast team has checked this coach’s credentials.')).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText(/lean bulk/), 'Bulk and fix shoulders');
  await fireEvent.press(screen.getByText('Request coaching'));
  expect(mockApi.requestCoach).toHaveBeenCalledWith('c1', 'Bulk and fix shoulders');
  await view.rerender(<SafeAreaProvider initialMetrics={metrics}><CoachProfileScreen /></SafeAreaProvider>);
  await waitFor(() => expect(screen.getByText(/Request sent/)).toBeTruthy());
});

test('Member with an active coach sees notes and can share progress', async () => {
  mockMe = { ready: true, userId: 'm1', email: 'ben@example.com', role: 'member', displayName: 'Ben', link: { id: 'l1', coach_id: 'c1', client_id: 'm1', status: 'active' } };
  await render(<CoachTab />);
  await waitFor(() => expect(screen.getByText('Add 20 g protein at breakfast.')).toBeTruthy());
  expect(screen.getByText('Your coach')).toBeTruthy();
  await fireEvent.press(screen.getByText('Share latest now'));
  expect(mockApi.pushSnapshot).toHaveBeenCalled();
  await waitFor(() => expect(screen.getByText('Shared just now.')).toBeTruthy());
});

test('Coach dashboard: profile, requests and clients', async () => {
  mockMe = { ready: true, userId: 'c1', email: 'ana@example.com', role: 'coach', displayName: 'Ana', link: null };
  await render(<CoachTab />);
  await waitFor(() => expect(screen.getByText('Requests (1)')).toBeTruthy());
  expect(screen.getByText('Coach accounts unlock every Forkcast Pro feature, free.')).toBeTruthy();
  expect(screen.getByText('Live in the coach directory')).toBeTruthy();
  expect(screen.getByText('“Help me bulk”')).toBeTruthy();
  await fireEvent.press(screen.getByText('Accept'));
  expect(mockApi.respondToRequest).toHaveBeenCalledWith('l1', true);
  await fireEvent.press(screen.getByText('Cara'));
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/client/[id]', params: { id: 'm2', name: 'Cara', link: 'l2' } });
});

test('Coach edits identity, certifications and awards, then publishes', async () => {
  mockMe = { ready: true, userId: 'c1', email: 'ana@example.com', role: 'coach', displayName: 'Ana', link: null };
  mockApi.myCoachProfile.mockResolvedValueOnce(null as any);
  await render(<CoachEditScreen />);
  await waitFor(() => expect(screen.getByText('Your coaching identity')).toBeTruthy());
  await fireEvent.changeText(screen.getByPlaceholderText('e.g. Ana Cruz'), 'Ana Cruz');
  // Publishing needs a headline.
  await fireEvent.press(screen.getByText('Publish profile'));
  expect(screen.getByText(/Add a short headline/)).toBeTruthy();
  expect(mockApi.saveCoachProfile).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByPlaceholderText(/Strength & physique coach/), 'Strength coach');
  await fireEvent.press(screen.getByText('Strength'));
  await fireEvent.press(screen.getByText('Add a certification'));
  await fireEvent.changeText(screen.getByPlaceholderText('e.g. Certified Personal Trainer'), 'CPT');
  await fireEvent.changeText(screen.getByPlaceholderText('e.g. NASM, ACE, PNF'), 'NASM');
  await fireEvent.press(screen.getByText('Add an award'));
  await fireEvent.changeText(screen.getByPlaceholderText('e.g. 1st place, Men’s Physique'), 'Coach of the Year');
  await fireEvent.changeText(screen.getByPlaceholderText('2023'), '2024');
  await fireEvent.press(screen.getByText('Publish profile'));
  await waitFor(() => expect(mockApi.saveCoachProfile).toHaveBeenCalled());
  const saved = (mockApi.saveCoachProfile.mock.calls[0] as any[])[0];
  expect(saved).toMatchObject({
    name: 'Ana Cruz', headline: 'Strength coach', specialties: ['Strength'], published: true,
    certifications: [{ name: 'CPT', issuer: 'NASM', year: null }], awards: [{ title: 'Coach of the Year', org: '', year: 2024 }],
  });
  expect(saved).not.toHaveProperty('verified');
  expect(screen.getByText(/Your profile is live/)).toBeTruthy();
});

test('Coach views a client’s progress and sends a note', async () => {
  mockMe = { ready: true, userId: 'c1', email: 'ana@example.com', role: 'coach', displayName: 'Ana', link: null };
  mockParams = { id: 'm2', name: 'Cara Diaz', link: 'l2' };
  const snap = buildSnapshot({
    profile, water: {}, logs: { [new Date().toISOString().slice(0, 10)]: [] }, weights: [{ d: '2026-10-01', kg: 62 }, { d: '2026-10-05', kg: 62.6 }],
    bodyChecks: [{ id: 'b', d: '2026-10-02', summary: 'Strong legs.', groups: [{ id: 'shoulders', name: 'Shoulders', status: 'needs_work', note: 'Smaller.' }], focus: [], balance: '', views: ['front'] }],
    training: { days: 3, equipment: 'gym', week: '', done: [], history: [] },
  })!;
  mockApi.getClientSnapshot.mockResolvedValueOnce({ data: snap, updated_at: new Date().toISOString() } as any);
  await render(<ClientScreen />);
  await waitFor(() => expect(screen.getByText('Last 14 days')).toBeTruthy());
  expect(screen.getByText(/Bulking · BMI 22.8/)).toBeTruthy();
  expect(screen.getByText(/Train more: Shoulders/)).toBeTruthy();
  expect(screen.getByText(/\+0.6 kg since/)).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText(/Great consistency/), 'Nice work this week');
  await fireEvent.press(screen.getByText('Send note'));
  expect(mockApi.sendNote).toHaveBeenCalledWith('m2', 'Nice work this week');
  await act(async () => {});
});

test('Sign-up as a coach asks to confirm email', async () => {
  mockMe = { ready: true, userId: null, email: null, role: null, displayName: '', link: null };
  mockParams = { role: 'coach' };
  await render(<AccountScreen />);
  expect(screen.getByText('Create your account')).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText('e.g. Ana Cruz'), 'Ana Cruz');
  await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'ana@example.com');
  await fireEvent.changeText(screen.getByPlaceholderText('At least 6 characters'), 'secret123');
  await fireEvent.press(screen.getAllByText('Create account')[1]);
  await waitFor(() => expect(mockApi.signUp).toHaveBeenCalledWith('ana@example.com', 'secret123', 'coach', 'Ana Cruz'));
  await waitFor(() => expect(screen.getByText(/We sent a confirmation link/)).toBeTruthy());
});
