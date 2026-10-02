/// <reference types="jest" />
import { act, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react-native';
import { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const render = (ui: ReactElement) => rtlRender(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
import { Alert } from 'react-native';

const mockRouter = { push: jest.fn(), back: jest.fn(), navigate: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  get router() { return mockRouter; },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/config', () => ({ AI_FEATURES: true, PAYWALL: true }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-image-picker', () => ({
  CameraType: { front: 'front', back: 'back' },
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///meal.jpg', width: 3000, height: 2000 }] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));
jest.mock('@/lib/scan-client', () => ({
  preparePhoto: jest.fn(async () => 'BASE64'),
  scanPhoto: jest.fn(async () => ({
    items: [
      { name: 'White rice', match: 'rice', grams: 160, portion: 'about 1 cup', confidence: 'high', n: [208, 4.4, 45, 0.4, 0.6, 0.1, 0.1, 2, 56, 16, 0.3, 19, 0.8, 0, 0, 0, 0, 5] },
      { name: 'Pork sisig', match: null, grams: 150, portion: 'small plate', confidence: 'medium', n: [420, 22, 6, 34, 0, 1, 12, 900, 300, 30, 1.5, 25, 3, 20, 2, 0.3, 0.6, 10] },
    ],
    note: 'Sisig may include egg.',
  })),
}));

jest.mock('@/lib/physique-client', () => ({
  checkPhysique: jest.fn(async () => ({
    ok: true,
    summary: 'Good base. Bring up shoulders and legs.',
    groups: [
      { id: 'shoulders', name: 'Shoulders', status: 'needs_work', note: 'Smaller than chest.' },
      { id: 'chest', name: 'Chest', status: 'strong', note: 'Well developed.' },
      { id: 'arms', name: 'Arms', status: 'on_track', note: '' },
      { id: 'back', name: 'Back', status: 'not_visible', note: '' },
      { id: 'core', name: 'Core', status: 'on_track', note: '' },
      { id: 'glutes', name: 'Glutes', status: 'not_visible', note: '' },
      { id: 'quads', name: 'Quads', status: 'needs_work', note: 'Lighter than upper body.' },
      { id: 'hamstrings', name: 'Hamstrings', status: 'not_visible', note: '' },
      { id: 'calves', name: 'Calves', status: 'on_track', note: '' },
    ],
    focus: [{ group: 'shoulders', why: 'Balances your chest.', exercises: [{ name: 'Lateral raises', sets: '4 × 12–15' }] }],
    balance: 'Even left to right.',
  })),
}));

import TodayScreen from '@/app/(tabs)/index';
import BodyCheckScreen from '@/app/body-check';
import BodyScreen from '@/app/(tabs)/body';
import PlanScreen from '@/app/(tabs)/plan';
import AddFoodScreen from '@/app/add';
import ScanScreen from '@/app/scan';
import PaywallScreen from '@/app/paywall';
import { hydrate, readState, todayStr } from '@/lib/store';

jest.useFakeTimers();

beforeAll(async () => { await hydrate(); });

test('Today asks for body stats before targets exist', async () => {
  await render(<TodayScreen />);
  expect(screen.getByText('Let’s set your targets')).toBeTruthy();
  await fireEvent.press(screen.getByText('Full nutrition label'));
  expect(screen.getByText('Nutrition Facts')).toBeTruthy();
});

test('Body form computes BMI and saves the profile', async () => {
  await render(<BodyScreen />);
  await fireEvent.press(screen.getByText('Male'));
  await fireEvent.changeText(screen.getByPlaceholderText('25'), '25');
  await fireEvent.changeText(screen.getByPlaceholderText('170'), '175');
  await fireEvent.changeText(screen.getByPlaceholderText('70'), '80');
  expect(screen.getByText('26.1')).toBeTruthy();
  expect(screen.getByText('BMI: Overweight')).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(500); });
  expect(readState().profile?.weightKg).toBe(80);
  // Switch to bulk and imperial
  await fireEvent.press(screen.getByText('Bulk'));
  await fireEvent.press(screen.getByText('lb, ft'));
  expect(screen.getByPlaceholderText('154').props.value).toBe('176.4');
  await act(async () => { jest.advanceTimersByTime(500); });
  expect(readState().profile?.goal).toBe('bulk');
  await fireEvent.press(screen.getByText('Cut'));
  await fireEvent.press(screen.getByText('kg, cm'));
  await act(async () => { jest.advanceTimersByTime(500); });
});

test('Meal plan builds meals and logs one to today', async () => {
  await render(<PlanScreen />);
  expect(screen.getByText('Your cutting day')).toBeTruthy();
  const logButtons = screen.getAllByText('Log to today');
  expect(logButtons.length).toBe(4);
  expect(screen.getByText('Plan total, 4 meals')).toBeTruthy();
  await fireEvent.press(logButtons[0]);
  expect((readState().logs[todayStr()] ?? []).length).toBeGreaterThan(0);
  // Breakfast is now eaten, and the other meals are resized to what's left of the day.
  expect(screen.getByText('Logged')).toBeTruthy();
  expect(screen.getAllByText('Log to today').length).toBe(3);
  expect(screen.getByText('Eaten so far plus the meals left')).toBeTruthy();
  await fireEvent.press(screen.getAllByText('Swap meal')[1]);
  await fireEvent.press(screen.getByText('Shuffle all meals'));
});

test('Search and add a food', async () => {
  mockParams = {};
  await render(<AddFoodScreen />);
  await fireEvent.changeText(screen.getByPlaceholderText('Search: rice, bangus, eggs, oats…'), 'bangus');
  await fireEvent.press(screen.getByText('Bangus (milkfish), grilled'));
  await fireEvent.press(screen.getByLabelText('More'));
  expect(screen.getByText('125 g')).toBeTruthy();
  await fireEvent.press(screen.getByText('Dinner'));
  const before = (readState().logs[todayStr()] ?? []).length;
  await fireEvent.press(screen.getByText('Add to log'));
  expect((readState().logs[todayStr()] ?? []).length).toBe(before + 1);
  expect(mockRouter.back).toHaveBeenCalled();
});

test('Custom food can be saved and found', async () => {
  await render(<AddFoodScreen />);
  await fireEvent.press(screen.getByText("Add a food that isn't listed"));
  await fireEvent.changeText(screen.getByPlaceholderText('e.g. Beef caldereta'), 'Caldereta');
  const kcal = screen.getAllByText('Calories')[0];
  expect(kcal).toBeTruthy();
});

test('Scan flow: camera, review, edit grams, add', async () => {
  await render(<ScanScreen />);
  await fireEvent.press(screen.getByText('Take a photo'));
  await waitFor(() => expect(screen.getByText('Found 2 foods')).toBeTruthy());
  expect(screen.getByText('Sisig may include egg. Adjust the grams if they look off, then add.')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Grams of White rice'), '316');
  expect(screen.getByText('410')).toBeTruthy();
  const before = (readState().logs[todayStr()] ?? []).length;
  await fireEvent.press(screen.getByText('Add to log'));
  const after = readState().logs[todayStr()];
  expect(after.length).toBe(before + 2);
  expect(after[after.length - 1].unit).toEqual({ kind: 'scan', grams: 150 });
  expect(readState().scanCount).toBe(1);
});

test('Free scans run out and the paywall unlocks Pro', async () => {
  await render(<ScanScreen />);
  await fireEvent.press(screen.getByText('Take a photo'));
  await waitFor(() => expect(screen.getByText('Found 2 foods')).toBeTruthy());
  await screen.unmount();
  await render(<ScanScreen />);
  expect(screen.getByText('You’ve used today’s free scans')).toBeTruthy();
  await screen.unmount();
  const spy = jest.spyOn(Alert, 'alert').mockImplementation((_t: string, _m?: string, buttons?: any) => { buttons?.[1]?.onPress?.(); });
  await render(<PaywallScreen />);
  await fireEvent.press(screen.getByText('Start Pro'));
  await act(async () => { jest.advanceTimersByTime(1000); });
  await waitFor(() => expect(readState().pro).toBe(true));
  spy.mockRestore();
});

test('Today shows the dashboard, logged foods, water and streak', async () => {
  await render(<TodayScreen />);
  expect(screen.getByText('Calories left')).toBeTruthy();
  expect(screen.getByText('Dinner')).toBeTruthy();
  expect(screen.getByText('Pork sisig')).toBeTruthy();
  expect(screen.getByText('Snap your plate')).toBeTruthy();
  expect(screen.getByText('1 day')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Add a glass of water'));
  await fireEvent.press(screen.getByLabelText('Add a glass of water'));
  expect(readState().water[todayStr()]).toBe(500);
  expect(screen.getByText(/^0\.5/)).toBeTruthy();
});

test('Body check: pick a photo, get muscle focus, saved to history', async () => {
  const spy = jest.spyOn(Alert, 'alert').mockImplementation((_t: string, _m?: string, buttons?: any) => { buttons?.[0]?.onPress?.(); });
  await render(<BodyCheckScreen />);
  expect(screen.getByText('See what to train next')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Front photo'));
  await waitFor(() => expect(screen.getByLabelText('Front photo, selected')).toBeTruthy());
  await fireEvent.press(screen.getByText('Check my body'));
  await waitFor(() => expect(screen.getByText('Your results')).toBeTruthy());
  expect(screen.getByText('Your focus plan')).toBeTruthy();
  expect(screen.getByText('Lateral raises')).toBeTruthy();
  expect(screen.getAllByText('Train more').length).toBe(2);
  expect(readState().bodyChecks.length).toBe(1);
  spy.mockRestore();
});

test('Body tab shows the latest body check', async () => {
  await render(<BodyScreen />);
  expect(screen.getByText('New body check')).toBeTruthy();
  await fireEvent.press(screen.getByText('Show full result and exercises'));
  expect(screen.getByText('Lateral raises')).toBeTruthy();
});
