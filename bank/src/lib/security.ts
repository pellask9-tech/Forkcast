/**
 * The app PIN and biometric unlock.
 *
 * The PIN is never stored. A random salt and the SHA-256 of salt + PIN go into the device's secure storage
 * (Keychain / Keystore), and a typed PIN is checked by hashing it the same way. After PIN_TRIES wrong
 * attempts the app makes you wait 30 seconds; each lockout after that doubles the wait, up to 15 minutes.
 * The counter is saved too, so closing the app doesn't reset it.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

import { PIN_LENGTH, PIN_TRIES } from '@/config';
import { secureDelete, secureGet, secureSet } from './secure-store';

const PIN_KEY = 'florin.pin';
const TRIES_KEY = 'florin.pin-tries';

interface Tries { failed: number; lockouts: number; until: number }
const NO_TRIES: Tries = { failed: 0, lockouts: 0, until: 0 };

const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const digest = (salt: string, pin: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await secureGet(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export const isValidPin = (pin: string) => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);

/** Rejects PINs that are easy to guess: one repeated digit, or a straight run like 123456 or 654321. */
export function weakPin(pin: string) {
  if (/^(\d)\1+$/.test(pin)) return true;
  const steps = pin.split('').map(Number).slice(1).map((d, i) => d - Number(pin[i]));
  return steps.every(s => s === 1) || steps.every(s => s === -1);
}

export async function setPin(pin: string) {
  const salt = hex(Crypto.getRandomBytes(16));
  await secureSet(PIN_KEY, JSON.stringify({ salt, hash: await digest(salt, pin) }));
  await secureDelete(TRIES_KEY);
}

export async function hasPin() {
  return !!(await readJson<{ hash: string }>(PIN_KEY))?.hash;
}

export async function clearPin() {
  await secureDelete(PIN_KEY);
  await secureDelete(TRIES_KEY);
}

export type PinCheck = { ok: true } | { ok: false; triesLeft: number; waitUntil: number };

export async function checkPin(pin: string, now = Date.now()): Promise<PinCheck> {
  const tries = (await readJson<Tries>(TRIES_KEY)) ?? NO_TRIES;
  if (tries.until > now) return { ok: false, triesLeft: 0, waitUntil: tries.until };
  const stored = await readJson<{ salt: string; hash: string }>(PIN_KEY);
  if (stored && (await digest(stored.salt, pin)) === stored.hash) {
    await secureDelete(TRIES_KEY);
    return { ok: true };
  }
  const failed = tries.failed + 1;
  if (failed < PIN_TRIES) {
    await secureSet(TRIES_KEY, JSON.stringify({ ...tries, failed, until: 0 }));
    return { ok: false, triesLeft: PIN_TRIES - failed, waitUntil: 0 };
  }
  // Locked out. Afterwards one more wrong PIN locks again, for twice as long.
  const lockouts = tries.lockouts + 1;
  const until = now + Math.min(15 * 60_000, 30_000 * 2 ** (lockouts - 1));
  await secureSet(TRIES_KEY, JSON.stringify({ failed: PIN_TRIES - 1, lockouts, until }));
  return { ok: false, triesLeft: 0, waitUntil: until };
}

/** When a lockout ends (0 if there isn't one). */
export async function lockedUntil(now = Date.now()) {
  const until = (await readJson<Tries>(TRIES_KEY))?.until ?? 0;
  return until > now ? until : 0;
}

/* ---------------- Biometrics ---------------- */
export type Biometric = 'face' | 'fingerprint' | 'iris';

/**
 * The kind of biometric unlock this phone can use, or null. Face ID needs the app's own build: Expo Go
 * can't ask for it, so it's treated as unavailable there.
 */
export async function biometricType(): Promise<Biometric | null> {
  if (process.env.EXPO_OS === 'web') return null;
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const { FACIAL_RECOGNITION, FINGERPRINT, IRIS } = LocalAuthentication.AuthenticationType;
    const expoGoIos = process.env.EXPO_OS === 'ios' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (types.includes(FACIAL_RECOGNITION) && !expoGoIos) return 'face';
    if (types.includes(FINGERPRINT)) return 'fingerprint';
    if (types.includes(IRIS)) return 'iris';
    return null;
  } catch {
    return null;
  }
}

export function biometricLabel(b: Biometric | null) {
  const ios = process.env.EXPO_OS === 'ios';
  return b === 'face' ? (ios ? 'Face ID' : 'face unlock') : b === 'fingerprint' ? (ios ? 'Touch ID' : 'fingerprint') : b === 'iris' ? 'iris' : '';
}

let prompting = false;
/** True while the system biometric sheet is up, so the auto-lock doesn't count it as leaving the app. */
export const isPrompting = () => prompting;

/** Shows the biometric prompt. Cancelling falls back to the PIN pad rather than the phone's passcode. */
export async function confirmWithBiometrics(promptMessage: string) {
  prompting = true;
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Use PIN', disableDeviceFallback: true, fallbackLabel: '' });
    return result.success;
  } catch {
    return false;
  } finally {
    prompting = false;
  }
}
