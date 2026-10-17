/* global jest */
// Native modules the screens use, replaced with in-memory versions for tests.
const memory = () => {
  let data = {};
  return {
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: k => { delete data[k]; },
    clear: () => { data = {}; },
    get length() { return Object.keys(data).length; },
    key: i => Object.keys(data)[i] ?? null,
  };
};
global.localStorage = memory();
jest.mock('expo-sqlite/localStorage/install', () => ({}));

const mockSecure = memory();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async k => mockSecure.getItem(k)),
  setItemAsync: jest.fn(async (k, v) => mockSecure.setItem(k, v)),
  deleteItemAsync: jest.fn(async k => mockSecure.removeItem(k)),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_alg, data) => require('crypto').createHash('sha256').update(data).digest('hex')),
  getRandomBytes: jest.fn(n => new Uint8Array(require('crypto').randomBytes(n))),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
  supportedAuthenticationTypesAsync: jest.fn(async () => []),
  authenticateAsync: jest.fn(async () => ({ success: true })),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
