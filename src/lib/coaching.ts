/**
 * Coaching: accounts, coach profiles, coach–client links, shared progress and coach notes.
 * Everything here goes through Supabase, and the database rules in supabase/schema.sql decide who
 * can read or change what. The app never relies on hiding buttons for privacy.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useSyncExternalStore } from 'react';

import { buildSnapshot, type ClientSnapshot } from './snapshot';
import { readState, setPro, subscribeState } from './store';
import { supabase } from './supabase';

export type Role = 'member' | 'coach';
export type LinkStatus = 'pending' | 'active' | 'declined' | 'ended';
export interface Cert { name: string; issuer: string; year: number | null }
export interface Award { title: string; org: string; year: number | null }
export interface CoachProfile {
  id: string;
  name: string;
  headline: string;
  bio: string;
  photo_url: string | null;
  specialties: string[];
  years_experience: number | null;
  location: string;
  certifications: Cert[];
  awards: Award[];
  accepting_clients: boolean;
  published: boolean;
  verified: boolean;
  updated_at?: string;
}
export type CoachDraft = Omit<CoachProfile, 'id' | 'verified' | 'updated_at'>;
export interface Link { id: string; coach_id: string; client_id: string; status: LinkStatus; message: string; created_at: string; updated_at: string }
export interface Note { id: string; coach_id: string; client_id: string; body: string; created_at: string }

export const SPECIALTIES = [
  'Fat loss', 'Muscle gain', 'Strength', 'Bodybuilding', 'Physique competition', 'Powerlifting',
  'Nutrition', 'Beginners', 'Women’s fitness', 'Home workouts', 'Sports performance', 'Mobility',
];

/* ---------------- Session state ---------------- */
export interface CoachingState {
  ready: boolean;
  userId: string | null;
  email: string | null;
  role: Role | null;
  displayName: string;
  /** The member's current coach link (pending or active), if any. */
  link: Link | null;
}
let state: CoachingState = { ready: false, userId: null, email: null, role: null, displayName: '', link: null };
const listeners = new Set<() => void>();
function set(patch: Partial<CoachingState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useCoaching = () => useSyncExternalStore(subscribe, () => state, () => state);
export const readCoaching = () => state;

function db() {
  if (!supabase) throw new Error('Coaching isn’t set up yet. Add your Supabase keys to .env.local (see README).');
  return supabase;
}
const fail = (e: { message: string } | null) => { if (e) throw new Error(friendly(e.message)); };
export function friendly(msg: string) {
  if (/Invalid login credentials/i.test(msg)) return 'That email and password don’t match. Check them and try again.';
  if (/Email not confirmed/i.test(msg)) return 'Confirm your email first. Check your inbox for the link, then sign in.';
  if (/already registered|already been registered/i.test(msg)) return 'There’s already an account with that email. Sign in instead.';
  if (/one_open_per_client|duplicate key/i.test(msg)) return 'You already have a coach or a pending request. End it before asking someone new.';
  if (/Password should be/i.test(msg)) return 'Use a password with at least 6 characters.';
  if (/Failed to fetch|Network request failed/i.test(msg)) return 'Couldn’t reach the server. Check your internet connection.';
  return msg;
}

/** Coaches get every Pro feature in the app for free. */
function applyCoachPerk(role: Role | null) {
  const app = readState();
  if (role === 'coach' && !app.pro) setPro(true, 'coach');
  if (role !== 'coach' && app.proPlan === 'coach') setPro(false, null);
}

async function loadProfile(userId: string, email: string | null) {
  const { data } = await db().from('profiles').select('role, display_name').eq('id', userId).maybeSingle();
  const role = (data?.role as Role | undefined) ?? 'member';
  set({ userId, email, role, displayName: data?.display_name ?? '' });
  applyCoachPerk(role);
  if (role === 'member') await refreshMyLink();
  else set({ link: null });
}

let started = false;
/** Call once at startup. Restores the saved session and keeps shared progress up to date. */
export function initCoaching() {
  if (started || !supabase) { set({ ready: true }); return; }
  started = true;
  supabase.auth.getSession().then(async ({ data }) => {
    const u = data.session?.user;
    if (u) await loadProfile(u.id, u.email ?? null).catch(() => {});
    set({ ready: true });
  });
  supabase.auth.onAuthStateChange((event, session) => {
    const u = session?.user;
    if (!u) {
      applyCoachPerk(null);
      set({ userId: null, email: null, role: null, displayName: '', link: null });
    } else if (event === 'SIGNED_IN' && u.id !== state.userId) {
      loadProfile(u.id, u.email ?? null).catch(() => {});
    }
  });
  startSnapshotSync();
}

/* ---------------- Accounts ---------------- */
export async function signUp(email: string, password: string, role: Role, displayName: string): Promise<{ needsConfirm: boolean }> {
  const { data, error } = await db().auth.signUp({ email: email.trim(), password, options: { data: { role, display_name: displayName.trim() } } });
  fail(error);
  if (data.session && data.user) await loadProfile(data.user.id, data.user.email ?? null);
  return { needsConfirm: !data.session };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await db().auth.signInWithPassword({ email: email.trim(), password });
  fail(error);
  if (data.user) await loadProfile(data.user.id, data.user.email ?? null);
}

export async function signOut() {
  await db().auth.signOut();
}

export async function setRole(role: Role) {
  const { error } = await db().from('profiles').update({ role }).eq('id', state.userId);
  fail(error);
  set({ role });
  applyCoachPerk(role);
  if (role === 'member') await refreshMyLink();
}

export async function setDisplayName(displayName: string) {
  const { error } = await db().from('profiles').update({ display_name: displayName.trim() }).eq('id', state.userId);
  fail(error);
  set({ displayName: displayName.trim() });
}

/* ---------------- Coach profiles ---------------- */
const COACH_COLUMNS = 'id, name, headline, bio, photo_url, specialties, years_experience, location, certifications, awards, accepting_clients, published, verified, updated_at';

export async function listCoaches(): Promise<CoachProfile[]> {
  const { data, error } = await db().from('coach_profiles').select(COACH_COLUMNS).eq('published', true)
    .order('verified', { ascending: false }).order('updated_at', { ascending: false }).limit(100);
  fail(error);
  return (data ?? []) as CoachProfile[];
}

export async function getCoach(id: string): Promise<CoachProfile | null> {
  const { data, error } = await db().from('coach_profiles').select(COACH_COLUMNS).eq('id', id).maybeSingle();
  fail(error);
  return data as CoachProfile | null;
}

export const myCoachProfile = () => (state.userId ? getCoach(state.userId) : Promise.resolve(null));

export const emptyCoachDraft = (name = ''): CoachDraft => ({
  name, headline: '', bio: '', photo_url: null, specialties: [], years_experience: null, location: '',
  certifications: [], awards: [], accepting_clients: true, published: false,
});

const year = (y: number | null) => y == null || (Number.isInteger(y) && y >= 1950 && y <= new Date().getFullYear() + 1);

/** Returns what to fix, or null when the profile can be saved. Mirrors the database checks. */
export function validateCoachDraft(d: CoachDraft): string | null {
  if (d.name.trim().length < 2) return 'Add your name as clients should see it.';
  if (d.name.length > 80) return 'Keep your name under 80 characters.';
  if (d.headline.length > 120) return 'Keep your headline under 120 characters.';
  if (d.bio.length > 2000) return 'Keep your bio under 2,000 characters.';
  if (d.years_experience != null && !(Number.isInteger(d.years_experience) && d.years_experience >= 0 && d.years_experience <= 70)) {
    return 'Years of experience should be a whole number from 0 to 70.';
  }
  if (d.certifications.length > 20 || d.awards.length > 20) return 'List up to 20 certifications and 20 awards.';
  if (d.certifications.some(c => !c.name.trim())) return 'Each certification needs a name, or remove the empty one.';
  if (d.awards.some(a => !a.title.trim())) return 'Each award needs a title, or remove the empty one.';
  if (![...d.certifications, ...d.awards].every(x => year(x.year))) return 'Check the years on your certifications and awards.';
  if (d.published && !d.headline.trim()) return 'Add a short headline before publishing, so members know what you do.';
  return null;
}

export async function saveCoachProfile(d: CoachDraft) {
  const problem = validateCoachDraft(d);
  if (problem) throw new Error(problem);
  const row = {
    id: state.userId,
    name: d.name.trim(), headline: d.headline.trim(), bio: d.bio.trim(), photo_url: d.photo_url,
    specialties: d.specialties, years_experience: d.years_experience, location: d.location.trim(),
    certifications: d.certifications.map(c => ({ ...c, name: c.name.trim(), issuer: c.issuer.trim() })),
    awards: d.awards.map(a => ({ ...a, title: a.title.trim(), org: a.org.trim() })),
    accepting_clients: d.accepting_clients, published: d.published,
  };
  const { error } = await db().from('coach_profiles').upsert(row);
  fail(error);
}

/** Resize to a 600 px square-ish JPEG, upload to the coach's own folder, return its public URL. */
export async function uploadCoachPhoto(uri: string, width: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  if (width > 600) ctx.resize({ width: 600 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ base64: true, compress: 0.8, format: SaveFormat.JPEG });
  if (!out.base64) throw new Error('Couldn’t read that photo.');
  const bin = atob(out.base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const path = `${state.userId}/photo-${Date.now()}.jpg`;
  const bucket = db().storage.from('coach-photos');
  const { error } = await bucket.upload(path, bytes.buffer, { contentType: 'image/jpeg', upsert: true });
  fail(error);
  return bucket.getPublicUrl(path).data.publicUrl;
}

/* ---------------- Links (member side) ---------------- */
export async function refreshMyLink(): Promise<Link | null> {
  if (!state.userId) return null;
  const { data, error } = await db().from('coach_clients').select('*').eq('client_id', state.userId)
    .in('status', ['pending', 'active']).order('created_at', { ascending: false }).limit(1).maybeSingle();
  fail(error);
  set({ link: (data as Link | null) ?? null });
  return state.link;
}

export async function requestCoach(coachId: string, message: string) {
  const { error } = await db().from('coach_clients').insert({ coach_id: coachId, client_id: state.userId, message: message.trim().slice(0, 500) });
  fail(error);
  await refreshMyLink();
  // Share progress straight away, so the coach can look before accepting once they do.
  await pushSnapshot().catch(() => {});
}

/** Member cancels a request or ends coaching. Their shared progress is deleted. */
export async function leaveCoach() {
  if (!state.link) return;
  const { error } = await db().from('coach_clients').update({ status: 'ended' }).eq('id', state.link.id);
  fail(error);
  await db().from('client_snapshots').delete().eq('client_id', state.userId);
  set({ link: null });
}

/* ---------------- Links (coach side) ---------------- */
export interface ClientRow extends Link { name: string }

export async function myClients(): Promise<ClientRow[]> {
  const { data, error } = await db().from('coach_clients').select('*').eq('coach_id', state.userId)
    .in('status', ['pending', 'active']).order('created_at', { ascending: true });
  fail(error);
  const links = (data ?? []) as Link[];
  if (!links.length) return [];
  const { data: people } = await db().from('profiles').select('id, display_name').in('id', links.map(l => l.client_id));
  const names = new Map((people ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name]));
  return links.map(l => ({ ...l, name: names.get(l.client_id) || 'Member' }));
}

export async function respondToRequest(linkId: string, accept: boolean) {
  const { error } = await db().from('coach_clients').update({ status: accept ? 'active' : 'declined' }).eq('id', linkId);
  fail(error);
}

export async function endCoaching(linkId: string) {
  const { error } = await db().from('coach_clients').update({ status: 'ended' }).eq('id', linkId);
  fail(error);
}

export async function getClientSnapshot(clientId: string): Promise<{ data: ClientSnapshot; updated_at: string } | null> {
  const { data, error } = await db().from('client_snapshots').select('data, updated_at').eq('client_id', clientId).maybeSingle();
  fail(error);
  return data as { data: ClientSnapshot; updated_at: string } | null;
}

/* ---------------- Notes ---------------- */
export async function listNotes(clientId: string): Promise<Note[]> {
  const { data, error } = await db().from('coach_notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(50);
  fail(error);
  return (data ?? []) as Note[];
}

export async function sendNote(clientId: string, body: string) {
  const text = body.trim();
  if (!text) throw new Error('Write a note first.');
  const { error } = await db().from('coach_notes').insert({ coach_id: state.userId, client_id: clientId, body: text.slice(0, 2000) });
  fail(error);
}

/* ---------------- Shared progress ---------------- */
/** Upload the member's progress summary. Only does anything while they have a coach (or a pending request). */
export async function pushSnapshot() {
  if (!supabase || state.role !== 'member' || !state.userId || !state.link) return false;
  const data = buildSnapshot(readState());
  if (!data) return false;
  const { error } = await supabase.from('client_snapshots').upsert({ client_id: state.userId, data, updated_at: new Date().toISOString() });
  fail(error);
  return true;
}

const SYNC_DELAY_MS = 20_000;
let timer: ReturnType<typeof setTimeout> | null = null;
function startSnapshotSync() {
  // Logging food, weight or a workout schedules one upload a little later, so a busy session
  // sends one update instead of dozens.
  subscribeState(() => {
    if (state.role !== 'member' || !state.link) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; pushSnapshot().catch(() => {}); }, SYNC_DELAY_MS);
  });
}
