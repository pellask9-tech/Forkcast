/// <reference types="jest" />
import { compact, formatTyped, money, moneyParts, parseAmount, typedToCents, typeKey } from '@/lib/money';
import { dayLabel, nextBankingDay, timeLabel } from '@/lib/dates';

describe('formatting', () => {
  it('shows pesos with grouping and centavos', () => {
    expect(money(0)).toBe('₱0.00');
    expect(money(5)).toBe('₱0.05');
    expect(money(123456)).toBe('₱1,234.56');
    expect(money(123_456_789_00)).toBe('₱123,456,789.00');
  });
  it('signs money out with a real minus and money in with + when asked', () => {
    expect(money(-50_00)).toBe('−₱50.00');
    expect(money(50_00, { sign: 'always' })).toBe('+₱50.00');
    expect(money(0, { sign: 'always' })).toBe('₱0.00');
    expect(moneyParts(-1_000_50)).toEqual({ sign: '−', whole: '1,000', frac: '50' });
  });
  it('rounds to whole pesos and compacts for chart axes', () => {
    expect(money(1_234_56, { whole: true })).toBe('₱1,235');
    expect(compact(950_00)).toBe('₱950');
    expect(compact(1_250_00)).toBe('₱1.3K');
    expect(compact(48_400_00)).toBe('₱48K');
    expect(compact(1_500_000_00)).toBe('₱1.5M');
  });
});

describe('parsing', () => {
  it('reads plain amounts and rejects anything else', () => {
    expect(parseAmount('1,234.5')).toBe(123450);
    expect(parseAmount('₱ 99')).toBe(9900);
    expect(parseAmount('0.07')).toBe(7);
    expect(parseAmount('12.345')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('keypad entry', () => {
  const type = (keys: string[]) => keys.reduce(typeKey, '');
  it('builds an amount key by key', () => {
    expect(type(['1', '2', '3', '4', '.', '5'])).toBe('1234.5');
    expect(formatTyped('1234.5')).toBe('1,234.5');
    expect(typedToCents('1234.5')).toBe(123450);
  });
  it('allows at most two decimals, one point and no leading zeros', () => {
    expect(type(['.', '5', '0', '9'])).toBe('0.50');
    expect(type(['0', '0', '7'])).toBe('7');
    expect(type(['1', '.', '.', '2'])).toBe('1.2');
    expect(type(['9', '9', 'del', 'del', 'del'])).toBe('');
    expect(formatTyped('')).toBe('0');
  });
  it('stops at seven whole digits', () => {
    expect(type('123456789'.split(''))).toBe('1234567');
  });
});

describe('dates', () => {
  it('labels days relative to today', () => {
    const now = new Date(2026, 9, 17, 15, 0).getTime();
    expect(dayLabel('2026-10-17', now)).toBe('Today');
    expect(dayLabel('2026-10-16', now)).toBe('Yesterday');
    expect(dayLabel('2026-10-18', now)).toBe('Tomorrow');
    expect(dayLabel('2026-10-13', now)).toBe('Tuesday, 13 October');
    expect(dayLabel('2025-12-25', now)).toBe('Thursday, 25 December 2025');
    expect(timeLabel(new Date(2026, 9, 17, 0, 5).getTime())).toBe('12:05 AM');
    expect(timeLabel(new Date(2026, 9, 17, 13, 42).getTime())).toBe('1:42 PM');
  });
  it('lands PESONet on the next weekday at 10 AM', () => {
    const friday = new Date(2026, 9, 16, 16, 30).getTime();
    expect(new Date(nextBankingDay(friday))).toEqual(new Date(2026, 9, 19, 10, 0));
  });
});
