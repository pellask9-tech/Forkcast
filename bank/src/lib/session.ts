/**
 * Whether the app is locked right now.
 *
 * It starts locked and locks again when it has been in the background for longer than the "Lock after"
 * setting. Whenever it isn't in the foreground a privacy cover hides the screen, so balances don't show
 * in the app switcher. A biometric prompt briefly makes the app inactive; that's ignored.
 */
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { isPrompting } from './security';

export interface Session { locked: boolean; covered: boolean }

let session: Session = { locked: true, covered: false };
let leftAt = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSession = () => session;
function set(patch: Partial<Session>) {
  session = { ...session, ...patch };
  listeners.forEach(l => l());
}
export const useSession = () => useSyncExternalStore(subscribe, getSession, getSession);

export const unlock = () => set({ locked: false });
export const lockNow = () => set({ locked: true });

/**
 * Starts watching the app's foreground state. `lockAfter` is read each time, so a settings change applies
 * straight away. `onReturn` runs whenever the app comes back to the foreground.
 */
export function watchAppState(lockAfter: () => number, onReturn: () => void) {
  const sub = AppState.addEventListener('change', next => {
    if (isPrompting()) return;
    if (next === 'active') {
      const away = leftAt ? Date.now() - leftAt : 0;
      set({ covered: false, locked: session.locked || (leftAt > 0 && away >= lockAfter() * 1000) });
      leftAt = 0;
      onReturn();
    } else {
      if (next === 'background' && !leftAt) leftAt = Date.now();
      set({ covered: true });
    }
  });
  return () => sub.remove();
}
