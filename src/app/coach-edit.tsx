import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { CoachAvatar, CoachCard } from '@/components/CoachCard';
import { ComingSoon } from '@/components/ComingSoon';
import { Screen } from '@/components/Screen';
import { Btn, Chip, Field, NoteBox, SectionRule, T } from '@/components/ui';
import { COACHING } from '@/config';
import {
  SPECIALTIES, emptyCoachDraft, myCoachProfile, saveCoachProfile, uploadCoachPhoto, useCoaching, validateCoachDraft,
  type Award, type Cert, type CoachDraft,
} from '@/lib/coaching';
import { F, usePalette } from '@/theme';

export default function CoachEditScreen() {
  return COACHING ? <CoachEditInner /> : <ComingSoon title="Coach profile" />;
}

const toYear = (s: string) => (s.trim() ? Number(s.trim()) : null);

function CoachEditInner() {
  const pal = usePalette();
  const me = useCoaching();
  const [d, setD] = useState<CoachDraft | null>(null);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    myCoachProfile()
      .then(p => {
        if (p) {
          const { id: _id, verified: v, updated_at: _u, ...rest } = p;
          setVerified(v);
          setD(rest);
        } else {
          setD(emptyCoachDraft(me.displayName));
        }
      })
      .catch(e => { setError(e?.message ?? 'Couldn’t load your profile.'); setD(emptyCoachDraft(me.displayName)); });
  }, [me.displayName]);

  if (me.role !== 'coach') {
    return (
      <Screen modal>
        <T v="h2">Coach profile</T>
        <T color={pal.muted} style={{ marginTop: 8, marginBottom: 18 }}>Sign in with a coach account to build your profile.</T>
        <Btn title="Back" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      </Screen>
    );
  }
  if (!d) {
    return <Screen modal><ActivityIndicator color={pal.ink} style={{ marginTop: 40 }} /></Screen>;
  }

  const up = (patch: Partial<CoachDraft>) => { setD({ ...d, ...patch }); setSaved(false); };
  const setCert = (i: number, patch: Partial<Cert>) => up({ certifications: d.certifications.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const setAward = (i: number, patch: Partial<Award>) => up({ awards: d.awards.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    const a = res.canceled ? null : res.assets?.[0];
    if (!a) return;
    setPhotoBusy(true);
    setError('');
    try {
      up({ photo_url: await uploadCoachPhoto(a.uri, a.width) });
    } catch (e: any) {
      setError(e?.message ?? 'Couldn’t upload that photo.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save(publish?: boolean) {
    const next = publish === undefined ? d! : { ...d!, published: publish };
    const problem = validateCoachDraft(next);
    if (problem) return setError(problem);
    setBusy(true);
    setError('');
    try {
      await saveCoachProfile(next);
      setD(next);
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? 'Couldn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen modal>
      <T v="small" color={pal.muted}>Coach profile</T>
      <T v="title">Your coaching identity</T>
      <T color={pal.muted} style={{ marginTop: 8 }}>
        This is what members see in the coach directory. Be specific: real certifications and results build trust.
      </T>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20 }}>
        <CoachAvatar coach={d} size={76} />
        <View style={{ flex: 1, gap: 6 }}>
          <Btn title={d.photo_url ? 'Change photo' : 'Add a photo'} kind="ghost" small loading={photoBusy} onPress={pickPhoto} style={{ alignSelf: 'flex-start' }} />
          <T v="tiny" color={pal.muted}>A clear, friendly headshot works best.</T>
        </View>
      </View>

      <View style={{ gap: 14, marginTop: 18 }}>
        <Field label="Name" value={d.name} onChangeText={name => up({ name })} autoCapitalize="words" placeholder="e.g. Ana Cruz" />
        <Field label="Headline" value={d.headline} onChangeText={headline => up({ headline })} placeholder="e.g. Strength & physique coach for busy professionals" maxLength={120} />
        <View>
          <T v="label" style={{ marginBottom: 5 }}>About you</T>
          <TextInput
            value={d.bio}
            onChangeText={bio => up({ bio })}
            multiline
            maxLength={2000}
            placeholder="How you coach, who you help best, and the results your clients get."
            placeholderTextColor={pal.muted}
            style={{ minHeight: 120, borderWidth: 1.5, borderColor: pal.line, borderRadius: 14, padding: 12, backgroundColor: pal.surface, color: pal.ink, fontFamily: F.regular, fontSize: 16, textAlignVertical: 'top' }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field label="City or region" value={d.location} onChangeText={location => up({ location })} placeholder="e.g. Quezon City" />
          <Field label="Years coaching" value={d.years_experience == null ? '' : String(d.years_experience)} keyboardType="number-pad"
            onChangeText={s => up({ years_experience: s.trim() ? Number(s.replace(/\D/g, '')) : null })} placeholder="e.g. 6" style={{ maxWidth: 140 }} />
        </View>
      </View>

      <SectionRule />
      <T v="h2">Specialties</T>
      <T v="small" color={pal.muted} style={{ marginTop: 2, marginBottom: 10 }}>Pick up to 6.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SPECIALTIES.map(s => {
          const on = d.specialties.includes(s);
          return (
            <Chip key={s} label={s} selected={on}
              onPress={() => up({ specialties: on ? d.specialties.filter(x => x !== s) : d.specialties.length < 6 ? [...d.specialties, s] : d.specialties })} />
          );
        })}
      </View>

      <SectionRule />
      <T v="h2">Certifications</T>
      <T v="small" color={pal.muted} style={{ marginTop: 2 }}>Personal training, nutrition, strength and first aid certificates.</T>
      {d.certifications.map((c, i) => (
        <ListItem key={i} onRemove={() => up({ certifications: d.certifications.filter((_, j) => j !== i) })}>
          <Field label="Certification" value={c.name} onChangeText={name => setCert(i, { name })} placeholder="e.g. Certified Personal Trainer" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Issued by" value={c.issuer} onChangeText={issuer => setCert(i, { issuer })} placeholder="e.g. NASM, ACE, PNF" />
            <Field label="Year" value={c.year == null ? '' : String(c.year)} keyboardType="number-pad" onChangeText={s => setCert(i, { year: toYear(s) })} placeholder="2022" style={{ maxWidth: 100 }} />
          </View>
        </ListItem>
      ))}
      <Btn title="Add a certification" kind="ghost" small style={{ alignSelf: 'flex-start', marginTop: 12 }}
        onPress={() => up({ certifications: [...d.certifications, { name: '', issuer: '', year: null }] })} />

      <SectionRule />
      <T v="h2">Awards and achievements</T>
      <T v="small" color={pal.muted} style={{ marginTop: 2 }}>Competition placings, titles, recognitions, notable client results.</T>
      {d.awards.map((a, i) => (
        <ListItem key={i} onRemove={() => up({ awards: d.awards.filter((_, j) => j !== i) })}>
          <Field label="Award" value={a.title} onChangeText={title => setAward(i, { title })} placeholder="e.g. 1st place, Men’s Physique" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Event or organisation" value={a.org} onChangeText={org => setAward(i, { org })} placeholder="e.g. PFBF Nationals" />
            <Field label="Year" value={a.year == null ? '' : String(a.year)} keyboardType="number-pad" onChangeText={s => setAward(i, { year: toYear(s) })} placeholder="2023" style={{ maxWidth: 100 }} />
          </View>
        </ListItem>
      ))}
      <Btn title="Add an award" kind="ghost" small style={{ alignSelf: 'flex-start', marginTop: 12 }}
        onPress={() => up({ awards: [...d.awards, { title: '', org: '', year: null }] })} />

      <SectionRule />
      <T v="h2">Taking clients</T>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Chip label="Accepting new clients" selected={d.accepting_clients} onPress={() => up({ accepting_clients: true })} />
        <Chip label="Full for now" selected={!d.accepting_clients} onPress={() => up({ accepting_clients: false })} />
      </View>

      <SectionRule />
      <T v="h2">Preview</T>
      <View style={{ marginTop: 10 }}>
        <CoachCard coach={{ ...d, id: me.userId ?? '', verified }} />
      </View>
      <T v="small" color={pal.muted} style={{ marginTop: 10 }}>
        {verified
          ? 'Your profile shows a Verified badge because the Forkcast team checked your credentials.'
          : 'The Verified badge is added by the Forkcast team after checking your certifications. Until then, your profile shows without it.'}
      </T>

      {error ? <View style={{ marginTop: 16 }}><NoteBox warn text={error} /></View> : null}
      {saved ? <View style={{ marginTop: 16 }}><NoteBox color={pal.fat} text={d.published ? 'Saved. Your profile is live in the coach directory.' : 'Saved as a draft. Only you can see it until you publish.'} /></View> : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        {d.published ? (
          <>
            <Btn title="Save changes" loading={busy} onPress={() => save()} />
            <Btn title="Unpublish" kind="ghost" disabled={busy} onPress={() => save(false)} />
          </>
        ) : (
          <>
            <Btn title="Publish profile" loading={busy} onPress={() => save(true)} />
            <Btn title="Save draft" kind="ghost" disabled={busy} onPress={() => save(false)} />
          </>
        )}
      </View>
      <Btn title="Done" kind="ghost" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => router.back()} />
    </Screen>
  );
}

function ListItem({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  const pal = usePalette();
  return (
    <View style={{ marginTop: 12, padding: 12, gap: 10, borderRadius: 16, borderWidth: 1, borderColor: pal.line, backgroundColor: pal.surface }}>
      {children}
      <Pressable onPress={onRemove} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
        <T v="small" color={pal.danger}>Remove</T>
      </Pressable>
    </View>
  );
}
