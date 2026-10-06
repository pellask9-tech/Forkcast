import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, TextInput, View } from 'react-native';

import { BodyMap } from '@/components/BodyMap';
import { ComingSoon } from '@/components/ComingSoon';
import { Screen } from '@/components/Screen';
import { Btn, NoteBox, SectionRule, T } from '@/components/ui';
import { COACHING } from '@/config';
import { endCoaching, getClientSnapshot, listNotes, sendNote, type Note } from '@/lib/coaching';
import { fmt, fmtW } from '@/lib/nutrition';
import { GROUP_NAMES, type GroupId } from '@/lib/program';
import { snapshotAverages, type ClientSnapshot } from '@/lib/snapshot';
import { parseD } from '@/lib/store';
import { F, goalColor, usePalette } from '@/theme';

export default function ClientScreen() {
  return COACHING ? <ClientInner /> : <ComingSoon title="Client" />;
}

const shortDate = (d: string) => parseD(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 36 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

function ClientInner() {
  const pal = usePalette();
  const { id, name, link } = useLocalSearchParams<{ id: string; name?: string; link?: string }>();
  const [snap, setSnap] = useState<{ data: ClientSnapshot; updated_at: string } | null | undefined>(undefined);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getClientSnapshot(id), listNotes(id)])
      .then(([s, n]) => { setSnap(s); setNotes(n); })
      .catch(e => { setError(e?.message ?? 'Couldn’t load this client.'); setSnap(null); });
  }, [id]);

  async function send() {
    setBusy(true);
    setError('');
    try {
      await sendNote(id, draft);
      setDraft('');
      setNotes(await listNotes(id));
    } catch (e: any) {
      setError(e?.message ?? 'Couldn’t send that note.');
    } finally {
      setBusy(false);
    }
  }

  function end() {
    if (!link) return;
    Alert.alert('End coaching?', `${name || 'This client'} will move out of your client list and you’ll lose access to their progress.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End coaching', style: 'destructive', onPress: () => endCoaching(link).then(() => router.back()).catch(e => setError(e?.message ?? 'Couldn’t end coaching.')) },
    ]);
  }

  if (snap === undefined) return <Screen modal><ActivityIndicator color={pal.ink} style={{ marginTop: 40 }} /></Screen>;
  const s = snap?.data;
  const color = goalColor(pal, s?.profile.goal);
  const avg = s ? snapshotAverages(s) : null;
  const maxKcal = s ? Math.max(s.targets.kcal * 1.3, ...s.days.map(d => d.kcal)) : 1;
  const priority = s?.bodyCheck?.groups.filter(g => g.status === 'needs_work').map(g => GROUP_NAMES[g.id as GroupId] ?? g.name) ?? [];

  return (
    <Screen modal>
      <T v="small" color={pal.muted}>Client</T>
      <T v="title">{name || 'Member'}</T>

      {!s ? (
        <T color={pal.muted} style={{ marginTop: 10 }}>
          {name || 'This client'} hasn’t shared progress yet. It appears here once they open Forkcast with an active coach.
        </T>
      ) : (
        <>
          <T color={pal.muted} style={{ marginTop: 4 }}>
            {s.profile.mode === 'cut' ? 'Cutting' : s.profile.mode === 'bulk' ? 'Bulking' : 'Maintaining'} · BMI {s.profile.bmi} ({s.profile.bmiLabel}) ·{' '}
            {fmtW(s.profile.weightKg, s.profile.units)} · {s.profile.age} · {s.profile.sex === 'f' ? 'female' : 'male'}
          </T>
          <T v="tiny" color={pal.muted} style={{ marginTop: 2 }}>Updated {ago(snap!.updated_at)}</T>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Stat label="Avg calories, 7 days" value={avg!.loggedDays ? fmt(avg!.kcal) : '–'} sub={`target ${fmt(s.targets.kcal)}`} />
            <Stat label="Avg protein, 7 days" value={avg!.loggedDays ? `${avg!.protein} g` : '–'} sub={`target ${fmt(s.targets.protein)} g`} />
            <Stat label="Days logged" value={`${avg!.loggedDays}/${avg!.of}`} sub="last 7 days" />
          </View>

          <SectionRule />
          <T v="h2">Last 14 days</T>
          <T v="small" color={pal.muted} style={{ marginTop: 2, marginBottom: 8 }}>Calories against the {fmt(s.targets.kcal)} kcal target (line).</T>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 4 }}
            accessibilityLabel={`Daily calories for the last 14 days. ${avg!.loggedDays} of the last 7 days logged.`}>
            {s.days.map(d => (
              <View key={d.d} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                <View style={{ height: `${(d.kcal / maxKcal) * 100}%`, minHeight: d.items ? 3 : 0, backgroundColor: d.items ? color : 'transparent', borderRadius: 3 }} />
              </View>
            ))}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: `${(s.targets.kcal / maxKcal) * 100}%`, height: 2, backgroundColor: pal.ink, opacity: 0.6 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <T v="tiny" color={pal.muted}>{shortDate(s.days[0].d)}</T>
            <T v="tiny" color={pal.muted}>Today</T>
          </View>
          {s.days.slice(-7).reverse().map(d => (
            <View key={d.d} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: pal.line }}>
              <T v="small">{shortDate(d.d)}</T>
              <T v="small" color={d.items ? pal.ink : pal.muted}>{d.items ? `${fmt(d.kcal)} kcal · ${Math.round(d.p)} g protein` : 'Nothing logged'}</T>
            </View>
          ))}

          {s.weights.length ? (
            <>
              <SectionRule />
              <T v="h2">Weight</T>
              <T style={{ marginTop: 4 }}>
                {fmtW(s.weights[s.weights.length - 1].kg, s.profile.units)} on {shortDate(s.weights[s.weights.length - 1].d)}
                {s.weights.length > 1 ? `, ${(() => {
                  const diff = s.weights[s.weights.length - 1].kg - s.weights[0].kg;
                  return `${diff >= 0 ? '+' : '−'}${fmtW(Math.abs(diff), s.profile.units)} since ${shortDate(s.weights[0].d)}`;
                })()}` : ''}
              </T>
            </>
          ) : null}

          <SectionRule />
          <T v="h2">Body check</T>
          {s.bodyCheck ? (
            <View style={{ marginTop: 8, gap: 10 }}>
              <T v="small" color={pal.muted}>From {shortDate(s.bodyCheck.d)}{priority.length ? `. Train more: ${priority.join(', ')}.` : '.'}</T>
              <BodyMap groups={s.bodyCheck.groups} />
              <T v="small">{s.bodyCheck.summary}</T>
            </View>
          ) : (
            <T color={pal.muted} style={{ marginTop: 6 }}>No body check yet. Ask them to do one so you can see what to focus on.</T>
          )}

          <SectionRule />
          <T v="h2">Training</T>
          <T style={{ marginTop: 4 }}>
            {s.training.doneThisWeek} of {s.training.daysPerWeek} sessions done this week ({s.training.equipment === 'home' ? 'home' : 'gym'} program).
          </T>
        </>
      )}

      <SectionRule />
      <T v="h2">Notes to {name?.split(' ')[0] || 'your client'}</T>
      <T v="small" color={pal.muted} style={{ marginTop: 2 }}>They see these in their Coach tab.</T>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        multiline
        maxLength={2000}
        placeholder="e.g. Great consistency! Add 20 g protein at breakfast and keep the 3 sessions."
        placeholderTextColor={pal.muted}
        style={{ marginTop: 10, minHeight: 80, borderWidth: 1.5, borderColor: pal.line, borderRadius: 14, padding: 12, backgroundColor: pal.surface, color: pal.ink, fontFamily: F.regular, fontSize: 16, textAlignVertical: 'top' }}
      />
      {error ? <View style={{ marginTop: 10 }}><NoteBox warn text={error} /></View> : null}
      <Btn title="Send note" loading={busy} disabled={!draft.trim()} style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={send} />
      {notes.map(n => (
        <View key={n.id} style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: pal.surface, borderWidth: 1, borderColor: pal.line }}>
          <T v="tiny" color={pal.muted}>{ago(n.created_at)}</T>
          <T style={{ marginTop: 2 }}>{n.body}</T>
        </View>
      ))}

      {link ? <Btn title="End coaching" kind="ghost" style={{ marginTop: 24, alignSelf: 'flex-start' }} onPress={end} /> : null}
    </Screen>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  const pal = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: pal.surface, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: pal.line }}>
      <T v="tiny" color={pal.muted}>{label}</T>
      <T v="h3">{value}</T>
      <T v="tiny" color={pal.muted}>{sub}</T>
    </View>
  );
}
