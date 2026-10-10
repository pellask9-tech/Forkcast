import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface ScanItem {
  name: string;
  match: string | null;
  grams: number;
  portion: string;
  confidence: 'high' | 'medium' | 'low';
  /** nutrients for the whole portion, in NUTRIENT_KEYS order */
  n: number[];
}
export interface ScanResult { items: ScanItem[]; note: string }

/** Resize to at most 1280 px wide and return base64 JPEG. Smaller uploads are faster and cheaper. */
export async function preparePhoto(uri: string, width: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (width > 1280) ctx.resize({ width: 1280 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
  if (!out.base64) throw new Error("Couldn't read that photo.");
  return out.base64;
}

/**
 * Relative URLs go to the Expo dev server while developing.
 * For store builds, set the server address with the expo-router "origin" option (see README).
 */
export async function scanPhoto(base64: string, signal?: AbortSignal): Promise<ScanResult> {
  let res: Response;
  try {
    res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mediaType: 'image/jpeg' }),
      signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new Error("Couldn't reach the scan server. Make sure `npx expo start` is still running.");
  }
  const data: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `The scan failed (error ${res.status}).`);
  return { items: Array.isArray(data?.items) ? data.items : [], note: String(data?.note ?? '') };
}
