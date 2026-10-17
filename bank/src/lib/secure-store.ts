/** Keychain (iOS) and Keystore-encrypted storage (Android), readable only while the phone is unlocked. */
import * as SecureStore from 'expo-secure-store';

const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export const secureGet = (key: string) => SecureStore.getItemAsync(key, options);
export const secureSet = (key: string, value: string) => SecureStore.setItemAsync(key, value, options);
export const secureDelete = (key: string) => SecureStore.deleteItemAsync(key, options);
