/**
 * Browsers have no keychain, so on web the PIN's salted hash sits in localStorage. That's fine for trying
 * the demo; a real web bank would check the PIN on its server instead.
 */
export async function secureGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export async function secureSet(key: string, value: string) {
  localStorage.setItem(key, value);
}
export async function secureDelete(key: string) {
  try { localStorage.removeItem(key); } catch {}
}
