/**
 * The current time as something screens can subscribe to, so render stays pure (React Compiler) and
 * anything showing "today" or a countdown updates on its own. Each interval has one shared timer that
 * only runs while something is listening.
 */
import { useSyncExternalStore } from 'react';

interface Ticker { now: number; listeners: Set<() => void>; timer?: ReturnType<typeof setInterval> }
const tickers = new Map<number, Ticker>();

function ticker(every: number) {
  let t = tickers.get(every);
  if (!t) {
    t = { now: Date.now(), listeners: new Set() };
    tickers.set(every, t);
  }
  return t;
}

function subscribe(every: number, listener: () => void) {
  const t = ticker(every);
  t.listeners.add(listener);
  if (!t.timer) {
    t.now = Date.now();
    t.timer = setInterval(() => {
      t.now = Date.now();
      t.listeners.forEach(l => l());
    }, every);
  }
  return () => {
    t.listeners.delete(listener);
    if (!t.listeners.size && t.timer) {
      clearInterval(t.timer);
      t.timer = undefined;
    }
  };
}

/** Milliseconds since the epoch, refreshed every `every` ms (a minute by default). */
export function useNow(every = 60_000) {
  return useSyncExternalStore(l => subscribe(every, l), () => ticker(every).now, () => ticker(every).now);
}
