import type { FocusArea, MuscleGroup } from './store';

export type PhysiqueResult =
  | { ok: true; summary: string; groups: MuscleGroup[]; focus: FocusArea[]; balance: string }
  | { ok: false; reason: 'minor' | 'explicit' | 'unclear'; message: string };

/** Sends 1–2 prepared photos (base64 JPEG, see preparePhoto in scan-client) to the body check server. */
export async function checkPhysique(
  images: { data: string; view: 'front' | 'back' }[],
  info: { goal: 'cut' | 'bulk'; sex: 'm' | 'f'; age: number },
  signal?: AbortSignal,
): Promise<PhysiqueResult> {
  let res: Response;
  try {
    res = await fetch('/api/physique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, ...info }),
      signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new Error("Couldn't reach the server. Make sure `npx expo start` is still running, or that your server is deployed.");
  }
  const data: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Body check failed (error ${res.status}).`);
  return data as PhysiqueResult;
}
