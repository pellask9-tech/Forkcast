/// <reference types="jest" />
import { fireEvent, render as rtlRender, screen } from '@testing-library/react-native';
import { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Uses the real src/config.ts: AI features and paywall switched off for the beta.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-image', () => ({ Image: () => null }));

import TodayScreen from '@/app/(tabs)/index';
import BodyScreen from '@/app/(tabs)/body';
import ScanScreen from '@/app/scan';
import BodyCheckScreen from '@/app/body-check';
import PaywallScreen from '@/app/paywall';
import { AI_FEATURES, PAYWALL } from '@/config';
import { hydrate, readState } from '@/lib/store';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const render = (ui: ReactElement) => rtlRender(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

jest.useFakeTimers();
beforeAll(async () => { await hydrate(); });

test('beta build has AI features and paywall switched off', () => {
  expect(AI_FEATURES).toBe(false);
  expect(PAYWALL).toBe(false);
});

test('Today shows log food, meal plan and body tiles, no scan', async () => {
  await render(<TodayScreen />);
  expect(screen.getByText('Log food')).toBeTruthy();
  expect(screen.getByText('Meal plan')).toBeTruthy();
  expect(screen.getByText('Body & BMI')).toBeTruthy();
  expect(screen.queryByText('Scan meal')).toBeNull();
  expect(screen.queryByText('Body check')).toBeNull();
  expect(screen.getByText('Water')).toBeTruthy();
});

test('Body tab has no body check or Pro section', async () => {
  await render(<BodyScreen />);
  await fireEvent.press(screen.getByText('Female'));
  await fireEvent.changeText(screen.getByPlaceholderText('25'), '22');
  await fireEvent.changeText(screen.getByPlaceholderText('170'), '160');
  await fireEvent.changeText(screen.getByPlaceholderText('70'), '55');
  expect(screen.getByText('21.5')).toBeTruthy();
  expect(screen.queryByText('Body check')).toBeNull();
  expect(screen.queryByText('Forkcast Pro')).toBeNull();
  expect(readState().pro).toBe(false);
});

test('Hidden screens show coming soon', async () => {
  await render(<ScanScreen />);
  expect(screen.getByText('This feature is coming after the beta.')).toBeTruthy();
  await screen.unmount();
  await render(<BodyCheckScreen />);
  expect(screen.getByText('This feature is coming after the beta.')).toBeTruthy();
  await screen.unmount();
  await render(<PaywallScreen />);
  expect(screen.getByText('This feature is coming after the beta.')).toBeTruthy();
});
