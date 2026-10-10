/**
 * POST /api/physique
 * Body: { images: { data: <base64 JPEG>, view: "front" | "back" }[], goal: "cut" | "bulk", sex: "m" | "f", age: number }
 * Returns: { ok: true, summary, groups, focus, balance } or { ok: false, reason, message }
 *
 * Runs on the server, like /api/scan. Photos are sent to Claude for this one request and are not stored.
 */

const GROUPS = [
  ['shoulders', 'Shoulders'],
  ['chest', 'Chest'],
  ['arms', 'Arms'],
  ['back', 'Back'],
  ['core', 'Core'],
  ['glutes', 'Glutes'],
  ['quads', 'Quads'],
  ['hamstrings', 'Hamstrings'],
  ['calves', 'Calves'],
] as const;
const STATUSES = ['strong', 'on_track', 'needs_work', 'not_visible'] as const;

function prompt(views: string[], goal: string, sex: string, age: number) {
  return `You are the "body check" feature in a fitness app. The user is an adult (${age}, ${sex === 'f' ? 'female' : 'male'}) whose goal is to ${goal === 'bulk' ? 'bulk (build muscle and size)' : 'cut (lose fat while keeping muscle)'}. They attached ${views.length === 2 ? 'two photos: a front view and a back view, in that order' : `one ${views[0]} view photo`} of themselves so they can see which muscle groups to train more.

Your job is only to compare how developed each visible muscle group looks relative to the person's other muscle groups, and turn that into training focus. Rules:
- Be encouraging and practical, like a good coach. Describe what to train, never what is wrong with the person.
- Do not comment on attractiveness, and do not estimate body fat percentage, weight or BMI.
- Do not guess who the person is.
- Mark a group "not_visible" if clothing, angle or lighting hides it. Do not guess.
- If the photo shows no person, several people, or is too unclear to judge, reply with {"ok":false,"reason":"unclear","message":"<one friendly sentence on how to retake it>"}.
- If the person looks younger than 18, reply with {"ok":false,"reason":"minor","message":"Body checks are only for adults."}.
- If the photo shows exposed genitals or is sexual, reply with {"ok":false,"reason":"explicit","message":"Please retake the photo in gym clothes, shorts or swimwear."}.

Muscle groups to rate, by id: ${GROUPS.map(g => g[0]).join(', ')}.
Status meanings: "strong" = a stand-out area compared with the rest of their body; "on_track" = in proportion; "needs_work" = noticeably less developed than the rest, worth prioritising; "not_visible" = can't judge from these photos.

Pick 2 or 3 focus areas from the "needs_work" groups (or, if none, the groups that would most improve overall balance). For each, give 2 or 3 exercises that need little or no special equipment where possible, with sets and reps suited to their goal.

Reply with only JSON, no other text:
{"ok":true,"summary":"Two encouraging sentences about overall balance.","groups":[{"id":"shoulders","status":"needs_work","note":"Short, specific, kind note (under 15 words)."}],"focus":[{"group":"shoulders","why":"One sentence on why this helps.","exercises":[{"name":"Pike push-ups","sets":"3 × 8–12"}]}],"balance":"One sentence about left/right or front/back balance, or an empty string."}
Include all ${GROUPS.length} groups in "groups".`;
}

const DEMO = {
  ok: true,
  summary: 'Nice foundation overall, with a well-developed chest and arms. Bringing up your shoulders and legs will make your physique look more balanced.',
  groups: [
    { id: 'shoulders', status: 'needs_work', note: 'Side delts look smaller than your chest and arms.' },
    { id: 'chest', status: 'strong', note: 'Well developed and even on both sides.' },
    { id: 'arms', status: 'on_track', note: 'In proportion with your upper body.' },
    { id: 'back', status: 'not_visible', note: 'Add a back photo to rate this.' },
    { id: 'core', status: 'on_track', note: 'Good midsection shape for your frame.' },
    { id: 'glutes', status: 'not_visible', note: 'Add a back photo to rate this.' },
    { id: 'quads', status: 'needs_work', note: 'Legs look lighter than your upper body.' },
    { id: 'hamstrings', status: 'not_visible', note: 'Add a back photo to rate this.' },
    { id: 'calves', status: 'on_track', note: 'In proportion with your legs.' },
  ],
  focus: [
    { group: 'shoulders', why: 'Wider shoulders balance a strong chest and make your frame look broader.', exercises: [{ name: 'Lateral raises', sets: '4 × 12–15' }, { name: 'Pike push-ups', sets: '3 × 8–12' }, { name: 'Face pulls or band pull-aparts', sets: '3 × 15' }] },
    { group: 'quads', why: 'Matching your legs to your upper body is the biggest balance upgrade.', exercises: [{ name: 'Goblet squats', sets: '4 × 10–12' }, { name: 'Bulgarian split squats', sets: '3 × 10 each leg' }] },
  ],
  balance: 'Left and right sides look even. Demo mode: this is a sample result, not your photo.',
};

const err = (message: string, status: number) => Response.json({ error: message }, { status });

function parseJson(text: string): any {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return null;
}

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return err('Invalid request.', 400); }

  const images: { data: string; view: string }[] = Array.isArray(body?.images) ? body.images.slice(0, 2) : [];
  if (!images.length || images.some(i => typeof i?.data !== 'string' || !i.data)) return err('No photo was sent.', 400);
  if (images.some(i => i.data.length > 6_500_000)) return err('That photo is too large. Try again with a smaller one.', 413);
  const age = Number(body?.age);
  if (!(age >= 18)) return Response.json({ ok: false, reason: 'minor', message: 'Body checks are only for adults.' });

  if (process.env.SCAN_DEMO === '1') {
    await new Promise(r => setTimeout(r, 1500));
    return Response.json({ ...DEMO, groups: DEMO.groups.map(g => ({ ...g, name: GROUPS.find(x => x[0] === g.id)![1] })) });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return err('The server has no ANTHROPIC_API_KEY. Add it to .env.local and restart Expo (or set SCAN_DEMO=1 to test without a key).', 500);

  // Production: check the caller's subscription here before spending money on the AI call.

  const views = images.map(i => (i.view === 'back' ? 'back' : 'front'));
  let r: Response;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: [
            ...images.map(i => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: i.data } })),
            { type: 'text', text: prompt(views, body?.goal === 'bulk' ? 'bulk' : 'cut', body?.sex === 'f' ? 'f' : 'm', age) },
          ],
        }],
      }),
    });
  } catch {
    return err("Couldn't reach the AI service. Check your internet connection.", 502);
  }

  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    console.error('[physique] Anthropic API error', r.status, detail.slice(0, 500));
    if (r.status === 401) return err('The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.', 502);
    if (r.status === 429) return err('Too many requests right now. Try again in a minute.', 429);
    if (r.status === 404) return err('The AI model name was not found. Check ANTHROPIC_MODEL.', 502);
    return err('Body check is unavailable right now.', 502);
  }

  const data: any = await r.json();
  const text = (data?.content ?? []).filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('');
  const p = parseJson(text);
  if (!p) return Response.json({ ok: false, reason: 'unclear', message: "Couldn't read that photo. Try again in good light, standing a few steps back." });
  if (p.ok === false) {
    const reason = ['minor', 'explicit', 'unclear'].includes(p.reason) ? p.reason : 'unclear';
    return Response.json({ ok: false, reason, message: String(p.message || 'Try another photo.').slice(0, 200) });
  }

  const byId = new Map<string, any>((Array.isArray(p.groups) ? p.groups : []).map((g: any) => [String(g?.id), g]));
  const groups = GROUPS.map(([id, name]) => {
    const g = byId.get(id);
    const status = STATUSES.includes(g?.status) ? g.status : 'not_visible';
    return { id, name, status, note: String(g?.note ?? '').slice(0, 120) };
  });
  const focus = (Array.isArray(p.focus) ? p.focus : []).slice(0, 3).map((f: any) => ({
    group: GROUPS.some(g => g[0] === f?.group) ? f.group : 'core',
    why: String(f?.why ?? '').slice(0, 200),
    exercises: (Array.isArray(f?.exercises) ? f.exercises : []).slice(0, 4).map((e: any) => ({ name: String(e?.name ?? '').slice(0, 60), sets: String(e?.sets ?? '').slice(0, 30) })).filter((e: any) => e.name),
  }));

  return Response.json({ ok: true, summary: String(p.summary ?? '').slice(0, 400), groups, focus, balance: String(p.balance ?? '').slice(0, 200) });
}
