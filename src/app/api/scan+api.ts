/**
 * POST /api/scan
 * Body: { image: <base64 JPEG>, mediaType?: "image/jpeg" }
 * Returns: { items: ScanItem[], note: string }
 *
 * This runs on the SERVER (your computer while you use `npx expo start`, or EAS Hosting in production),
 * so the Anthropic API key in .env never ships inside the app.
 */
import { FOODS, NUTRIENT_KEYS } from '@/lib/foods';

// Keys Claude returns, in the same order as NUTRIENT_KEYS
const JSON_KEYS = [
  'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugars_g', 'sat_fat_g', 'sodium_mg', 'potassium_mg',
  'calcium_mg', 'iron_mg', 'magnesium_mg', 'zinc_mg', 'vitamin_a_ug', 'vitamin_c_mg', 'vitamin_d_ug', 'vitamin_b12_ug', 'folate_ug',
] as const;

const PROMPT = `You are the food scanner in a calorie and nutrition tracking app. Look at the attached photo of a meal and identify each separate food or drink in it.

For each item, estimate the portion actually shown, in grams. Use plates, bowls, utensils, cups and hands for scale (a dinner plate is about 26 cm across, a cup of cooked rice is about 160 g). Meals may be home cooked from any cuisine, including Filipino dishes such as adobo, sinigang, tinola or rice with a viand. Count a sauce or dressing as part of its dish unless it is served separately.

If an item is clearly the same food as one in this database, put its id in "match"; otherwise use null:
${FOODS.map(f => `${f.id}: ${f.name}`).join('\n')}

Estimate nutrients for the whole portion shown (not per 100 g).

Reply with only JSON in exactly this shape, no other text:
{"items":[{"name":"Chicken adobo","match":"adobo","grams":180,"portion":"about 2 pieces with sauce","confidence":"medium","kcal":396,"protein_g":36,"carbs_g":5,"fat_g":25,"fiber_g":0.4,"sugars_g":2,"sat_fat_g":7,"sodium_mg":1300,"potassium_mg":360,"calcium_mg":30,"iron_mg":2.2,"magnesium_mg":36,"zinc_mg":3.1,"vitamin_a_ug":48,"vitamin_c_mg":1,"vitamin_d_ug":0.2,"vitamin_b12_ug":0.5,"folate_ug":12}],"note":"One short sentence about anything you were unsure of, or an empty string."}

"confidence" is "high", "medium" or "low". If the photo shows no food, reply {"items":[],"note":"<one sentence on what the photo shows instead>"}.`;

const DEMO_RESULT = {
  items: [
    { name: 'White rice', match: 'rice', grams: 160, portion: 'about 1 cup', confidence: 'high', n: [208, 4.4, 45, 0.4, 0.6, 0.1, 0.1, 2, 56, 16, 0.3, 19, 0.8, 0, 0, 0, 0, 5] },
    { name: 'Chicken adobo', match: 'adobo', grams: 180, portion: '2 pieces with sauce', confidence: 'medium', n: [396, 36, 5, 25, 0.4, 2, 7, 1320, 360, 30, 2.2, 36, 3.1, 48, 1, 0.2, 0.5, 12] },
    { name: 'Sautéed kangkong', match: null, grams: 90, portion: 'small side', confidence: 'medium', n: [55, 2.2, 3.5, 3.8, 1.9, 0.5, 0.6, 310, 170, 50, 1.2, 50, 0.2, 240, 14, 0, 0, 50] },
  ],
  note: 'Demo mode: this is a sample result, not your photo.',
};

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseJson(text: string): any {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) {
    try { return JSON.parse(t.slice(a, b + 1)); } catch {}
  }
  return null;
}

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return error('Invalid request.', 400); }

  if (process.env.SCAN_DEMO === '1') {
    await new Promise(r => setTimeout(r, 1500));
    return Response.json(DEMO_RESULT);
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return error('The scan server has no ANTHROPIC_API_KEY. Add it to the .env file and restart Expo (or set SCAN_DEMO=1 to test without a key).', 500);

  const image = typeof body?.image === 'string' ? body.image : '';
  if (!image) return error('No photo was sent.', 400);
  if (image.length > 6_500_000) return error('That photo is too large. Try again with a smaller one.', 413);
  const mediaType = ['image/jpeg', 'image/png', 'image/webp'].includes(body?.mediaType) ? body.mediaType : 'image/jpeg';

  // Production: check the caller's subscription here before spending money on the AI call.

  let r: Response;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });
  } catch {
    return error("Couldn't reach the AI service. Check your internet connection.", 502);
  }

  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    console.error('[scan] Anthropic API error', r.status, detail.slice(0, 500));
    if (r.status === 401) return error('The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.', 502);
    if (r.status === 429) return error('Too many scans right now. Try again in a minute.', 429);
    if (r.status === 404) return error('The AI model name was not found. Check ANTHROPIC_MODEL in .env.', 502);
    return error('The food scanner is unavailable right now.', 502);
  }

  const data: any = await r.json();
  const text = (data?.content ?? []).filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('');
  const parsed = parseJson(text);
  if (!parsed || !Array.isArray(parsed.items)) return error("Couldn't read the scan result. Try another photo.", 502);

  const items = parsed.items.slice(0, 12).map((it: any) => {
    const grams = Math.min(3000, Math.max(0, Number(it?.grams) || 0));
    if (!grams) return null;
    return {
      name: String(it?.name ?? 'Food').slice(0, 60),
      match: typeof it?.match === 'string' && FOODS.some(f => f.id === it.match) ? it.match : null,
      grams: Math.round(grams),
      portion: String(it?.portion ?? '').slice(0, 60),
      confidence: ['high', 'medium', 'low'].includes(it?.confidence) ? it.confidence : 'medium',
      n: JSON_KEYS.map(k => Math.max(0, Number(it?.[k]) || 0)),
    };
  }).filter(Boolean);

  if (items.length && items[0].n.length !== NUTRIENT_KEYS.length) return error('Scan result was malformed.', 502);
  return Response.json({ items, note: typeof parsed.note === 'string' ? parsed.note.slice(0, 200) : '' });
}
