/// <reference types="jest" />
import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Cards from '@/app/(tabs)/cards';
import Home from '@/app/(tabs)/(home)';
import Insights from '@/app/(tabs)/insights';
import Activity from '@/app/activity';
import PayBill from '@/app/bill';
import Move from '@/app/move';
import Send from '@/app/send';
import Welcome from '@/app/welcome';
import { LockScreen } from '@/components/LockScreen';
import { balanceOf } from '@/lib/ledger';
import { money } from '@/lib/money';
import { checkPin, clearPin, hasPin, setPin } from '@/lib/security';
import { lockNow, useSession } from '@/lib/session';
import { EVERYDAY_ID, SAVINGS_ID } from '@/lib/seed';
import { hydrate, openAccount, readBank, resetAll } from '@/lib/store';

// Jest hoists these mocks above the imports.
const mockRouter = { push: jest.fn(), back: jest.fn(), navigate: jest.fn(), replace: jest.fn(), dismissAll: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- a mock factory can't use the file's imports */
  const { createElement, Fragment } = require('react');
  const { Text } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  // The navigation bar drawn inline, so tests can read its title and press Back, Cancel and Done.
  const Screen = ({ options = {} }: { options?: any }) => createElement(Fragment, null,
    options.title ? createElement(Text, { accessibilityRole: 'header' }, options.title) : null,
    options.headerLeft?.({}) ?? null,
    options.headerRight?.({}) ?? null);
  return { useRouter: () => mockRouter, useLocalSearchParams: () => mockParams, Stack: { Screen } };
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const render = (ui: ReactElement) => rtlRender(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

const PIN = '135790';
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));
/** Taps keys on the on-screen number pad, one at a time. */
async function keypad(keys: string) {
  for (const k of keys) await press(k === '.' ? 'Decimal point' : k);
}
const books = () => readBank().books!;

// A Wednesday morning, so instant and next-day transfers behave the same on every run.
jest.useFakeTimers({ now: new Date(2026, 9, 14, 10, 0) });

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  await resetAll();
  hydrate();
  openAccount('Ria Santos');
  await setPin(PIN);
});

describe('opening an account', () => {
  beforeEach(async () => { await resetAll(); });

  test('takes a name and a PIN, typed twice', async () => {
    await render(<Welcome />);
    expect(screen.getByText(/This is a demo/)).toBeOnTheScreen();
    await press('Open a demo account');

    await press('Continue');
    expect(screen.getByText('Enter your name')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Full name'), '  Ria   Santos ');
    await press('Continue');

    await keypad('123456');
    expect(await screen.findByText(/easy to guess/)).toBeOnTheScreen();
    await keypad(PIN);
    expect(await screen.findByText('Enter it again')).toBeOnTheScreen();
    await keypad('246802');
    expect(await screen.findByText('Those didn’t match')).toBeOnTheScreen();
    expect(readBank().books).toBeNull();

    await keypad(PIN);
    await screen.findByText('Enter it again');
    await keypad(PIN);
    await waitFor(() => expect(readBank().books?.owner.name).toBe('Ria Santos'));
    expect(await hasPin()).toBe(true);
    expect(await checkPin(PIN)).toEqual({ ok: true });
  });
});

test('home shows the balance, accounts and recent activity', async () => {
  await render(<Home />);
  expect(screen.getByRole('header', { name: 'Hi, Ria' })).toBeOnTheScreen();
  expect(screen.getByText('Total balance')).toBeOnTheScreen();
  expect(button(/^Everyday/)).toBeOnTheScreen();
  expect(button(/^Savings/)).toBeOnTheScreen();
  expect(screen.getByText('Recent activity')).toBeOnTheScreen();

  await press('Send');
  expect(mockRouter.push).toHaveBeenCalledWith('/send');
  await press(/^Savings/);
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/account/[id]', params: { id: SAVINGS_ID } });
});

describe('sending money', () => {
  test('to a saved person, after a wrong PIN', async () => {
    const before = balanceOf(books(), EVERYDAY_ID);
    await render(<Send />);
    await press(/^Mika Santos/);
    await keypad('1250');
    await press('Continue');

    expect(screen.getByText('In a few seconds')).toBeOnTheScreen();
    await press('Send ₱1,250.00');
    await keypad('111111');
    expect(await screen.findByText('Wrong PIN. 4 tries left.')).toBeOnTheScreen();
    expect(balanceOf(books(), EVERYDAY_ID)).toBe(before);

    await keypad(PIN);
    expect(await screen.findByText('Money sent')).toBeOnTheScreen();
    expect(balanceOf(books(), EVERYDAY_ID)).toBe(before - 1_250_00);
    expect(books().txns[0]).toMatchObject({ title: 'Mika Santos', amount: -1_250_00, status: 'done', method: 'instapay' });

    // One in the navigation bar, one under the receipt.
    for (const done of screen.getAllByRole('button', { name: 'Done' })) await fireEvent.press(done);
    expect(mockRouter.back).toHaveBeenCalledTimes(2);
  });

  test('says when there isn’t enough money', async () => {
    await render(<Send />);
    await press(/^Paolo Reyes/);
    await keypad('9999999');
    await press('Continue');
    expect(screen.getByText(`That's more than the ${money(balanceOf(books(), EVERYDAY_ID))} you have`)).toBeOnTheScreen();
    expect(screen.queryByText('Review')).not.toBeOnTheScreen();
  });

  test('by PESONet, which arrives the next banking day', async () => {
    const before = balanceOf(books(), EVERYDAY_ID);
    await render(<Send />);
    await press(/^Nico Villanueva/);
    await keypad('5000');
    await press('PESONet · next day');
    await press('Continue');
    expect(screen.getByText('PESONet')).toBeOnTheScreen();
    expect(screen.getByText(/^Tomorrow by /)).toBeOnTheScreen();
    await press('Send ₱5,000.00');
    await keypad(PIN);
    expect(await screen.findByText('Transfer on its way')).toBeOnTheScreen();
    expect(books().txns[0]).toMatchObject({ amount: -5_000_00, status: 'pending', method: 'pesonet' });
    // Pending money has already left the available balance.
    expect(balanceOf(books(), EVERYDAY_ID)).toBe(before - 5_000_00);
  });

  test('switches to PESONet above the InstaPay limit', async () => {
    await render(<Send />);
    await press(/^Nico Villanueva/);
    await keypad('60000');
    expect(button('PESONet · next day')).toBeSelected();
    await press('InstaPay · instant');
    await press('Continue');
    expect(screen.getByText(/^(InstaPay sends up to ₱50,000|That's more than)/)).toBeOnTheScreen();
  });
});

test('pays a saved biller', async () => {
  const before = balanceOf(books(), EVERYDAY_ID);
  await render(<PayBill />);
  await press(/^Meralco, Saved/);
  await keypad('2850.5');
  await press('Continue');
  await press('Pay ₱2,850.50');
  await keypad(PIN);
  expect(await screen.findByText('Bill paid')).toBeOnTheScreen();
  expect(balanceOf(books(), EVERYDAY_ID)).toBe(before - 2_850_50);
});

test('moves money into a goal without a PIN', async () => {
  mockParams = { from: EVERYDAY_ID, to: 'goal-japan' };
  const goal = balanceOf(books(), 'goal-japan');
  await render(<Move />);
  await keypad('500');
  await press('Move ₱500.00');
  expect(await screen.findByText('Moved')).toBeOnTheScreen();
  expect(balanceOf(books(), 'goal-japan')).toBe(goal + 500_00);
});

test('a frozen card declines payments', async () => {
  await render(<Cards />);
  await press('Freeze');
  expect(screen.getByText(/This card is frozen/)).toBeOnTheScreen();
  expect(books().cards[0].frozen).toBe(true);

  await press('Test payment');
  expect(screen.getByText(/^Declined: .*Card is frozen\.$/)).toBeOnTheScreen();
  expect(books().txns[0]).toMatchObject({ status: 'declined', reason: 'Card is frozen' });

  await press('Unfreeze');
  await press('Test payment');
  expect(screen.getByText(/^Approved: /)).toBeOnTheScreen();
});

describe('the lock screen', () => {
  function Locked() {
    const { locked } = useSession();
    return locked ? <LockScreen /> : null;
  }

  test('opens with the right PIN', async () => {
    lockNow();
    await render(<Locked />);
    expect(screen.getByText('Welcome back, Ria')).toBeOnTheScreen();
    await keypad('000000');
    expect(await screen.findByText('Wrong PIN. 4 tries left.')).toBeOnTheScreen();
    await keypad(PIN);
    await waitFor(() => expect(screen.queryByText('Enter your PIN')).not.toBeOnTheScreen());
  });

  test('makes you wait after five wrong PINs', async () => {
    lockNow();
    await render(<Locked />);
    for (let i = 0; i < 5; i++) {
      await keypad('000000');
      await screen.findAllByText(/Wrong PIN|Too many/);
    }
    expect(await screen.findByText('Too many wrong PINs')).toBeOnTheScreen();
    expect(screen.getByText(/Try again in 0:\d\d/)).toBeOnTheScreen();
    // Even the right PIN is refused until the wait is over.
    expect(await checkPin(PIN)).toMatchObject({ ok: false });
  });

  afterAll(async () => { await clearPin(); });
});

test('insights shows this month by category', async () => {
  await render(<Insights />);
  expect(screen.getByText('Spent so far in October')).toBeOnTheScreen();
  expect(screen.getByText('By category')).toBeOnTheScreen();
  expect(screen.getByText('Money in and out')).toBeOnTheScreen();
  await press(/^Bills & rent/);
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/activity', params: { category: 'bills', month: '2026-10' } });
});

test('activity can be searched', async () => {
  await render(<Activity />);
  await fireEvent.changeText(screen.getByLabelText('Search payments'), 'meralco');
  expect(screen.getAllByRole('button', { name: /^Meralco/ }).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: /^Jollibee/ })).not.toBeOnTheScreen();
});
