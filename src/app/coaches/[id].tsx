import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';

import { CoachAvatar, VerifiedBadge } from '@/components/CoachCard';
import { ComingSoon } from '@/components/ComingSoon';
import { Screen } from '@/components/Screen';
import { Btn, NoteBox, SectionRule, T } from '@/components/ui';
import { COACHING } from '@/config';
import { getCoach, requestCoach, useCoaching, type CoachProfile } from '@/lib/coaching';
import { F, usePalette } from '@/theme';

export default function CoachProfileScreen() {
  return COACHING ? <CoachProfileInner /> : <ComingSoon title="Coach" />;
}

function CoachProfileInner() {
  const pal = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useCoaching();
  const [coach, setCoach] = useState<CoachProfile | null | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCoach(id).then(setCoach).catch(e => { setError(e?.message ?? 'Couldn’t load this coach.'); setCoach(null); });
  }, [id]);

  if (coach === undefined) return <Screen modal><ActivityIndicator color={pal.ink} style={{ marginTop: 40 }} /></Screen>;
  if (!coach) {
    return (
      <Screen modal>
        <T v="h2">Coach not found</T>
        <T color={pal.muted} style={{ marginTop: 8, marginBottom: 18 }}>{error || 'This coach’s profile isn’t public any more.'}</T>
        <Btn title="Back" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
      </Screen>
    );
  }

  const isMe = me.userId === coach.id;
  const withThisCoach = me.link?.coach_id === coach.id ? me.link : null;

  async function send() {
    setBusy(true);
    setError('');
    try {
      await requestCoach(coach!.id, message);
    } catch (e: any) {
      setError(e?.message ?? 'Couldn’t send your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen modal>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <CoachAvatar coach={coach} size={104} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <T v="title" style={{ textAlign: 'center' }}>{coach.name}</T>
        </View>
        {coach.verified ? <VerifiedBadge /> : null}
        {coach.headline ? <T style={{ textAlign: 'center' }}>{coach.headline}</T> : null}
        <T v="small" color={pal.muted} style={{ textAlign: 'center' }}>
          {[coach.years_experience != null ? `${coach.years_experience} years coaching` : null, coach.location || null].filter(Boolean).join(' · ')}
        </T>
      </View>

      {coach.specialties.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16, justifyContent: 'center' }}>
          {coach.specialties.map(s => (
            <View key={s} style={{ borderWidth: 1, borderColor: pal.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <T v="small">{s}</T>
            </View>
          ))}
        </View>
      ) : null}

      {coach.bio ? (
        <>
          <SectionRule />
          <T v="h2">About</T>
          <T style={{ marginTop: 6 }}>{coach.bio}</T>
        </>
      ) : null}

      {coach.awards.length ? (
        <>
          <SectionRule />
          <T v="h2">Awards and achievements</T>
          {coach.awards.map((a, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: pal.line }}>
              <T style={{ fontFamily: F.black, fontSize: 20 }}>🏆</T>
              <View style={{ flex: 1 }}>
                <T v="label">{a.title}</T>
                <T v="small" color={pal.muted}>{[a.org, a.year].filter(Boolean).join(', ')}</T>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {coach.certifications.length ? (
        <>
          <SectionRule />
          <T v="h2">Certifications</T>
          {coach.certifications.map((c, i) => (
            <View key={i} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: pal.line }}>
              <T v="label">{c.name}</T>
              <T v="small" color={pal.muted}>{[c.issuer, c.year].filter(Boolean).join(', ')}</T>
            </View>
          ))}
          <T v="tiny" color={pal.muted} style={{ marginTop: 6 }}>
            {coach.verified ? 'The Forkcast team has checked this coach’s credentials.' : 'Listed by the coach. Not yet checked by the Forkcast team.'}
          </T>
        </>
      ) : null}

      <SectionRule />
      {isMe ? (
        <>
          <T color={pal.muted}>This is how members see your profile.</T>
          <Btn title="Edit profile" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.push('/coach-edit')} />
        </>
      ) : !me.userId ? (
        <>
          <T v="h2">Work with {coach.name.split(' ')[0]}</T>
          <T color={pal.muted} style={{ marginTop: 6 }}>Sign in or create a free account to send a coaching request.</T>
          <Btn title="Sign in to request" style={{ marginTop: 12 }} onPress={() => router.push('/account')} />
        </>
      ) : me.role === 'coach' ? (
        <T color={pal.muted}>You’re signed in as a coach. Switch to a member account to request coaching.</T>
      ) : withThisCoach ? (
        <NoteBox color={pal.fat} text={withThisCoach.status === 'active'
          ? `${coach.name} is your coach. Find their notes in the Coach tab.`
          : `Request sent. ${coach.name} will see it in their dashboard. You’ll find their reply in the Coach tab.`} />
      ) : me.link ? (
        <T color={pal.muted}>You already have a coach or a pending request. End it in the Coach tab before asking someone new.</T>
      ) : !coach.accepting_clients ? (
        <T color={pal.muted}>{coach.name} isn’t taking new clients right now. Check back later.</T>
      ) : (
        <>
          <T v="h2">Work with {coach.name.split(' ')[0]}</T>
          <View style={{ marginTop: 10 }}>
            <T v="label" style={{ marginBottom: 5 }}>Your goal, in a sentence or two (optional)</T>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              placeholder="e.g. I want to lean bulk and fix my weak shoulders."
              placeholderTextColor={pal.muted}
              style={{ minHeight: 80, borderWidth: 1.5, borderColor: pal.line, borderRadius: 14, padding: 12, backgroundColor: pal.surface, color: pal.ink, fontFamily: F.regular, fontSize: 16, textAlignVertical: 'top' }}
            />
          </View>
          <View style={{ marginTop: 12 }}>
            <NoteBox text={`If ${coach.name.split(' ')[0]} accepts, they’ll see your goal, BMI, targets, daily calorie and protein totals for the last 14 days, weight log, body check results (never your photos) and workout progress. You can end coaching at any time, and that deletes what was shared.`} />
          </View>
          {error ? <View style={{ marginTop: 12 }}><NoteBox warn text={error} /></View> : null}
          <Btn title="Request coaching" loading={busy} style={{ marginTop: 14 }} onPress={send} />
        </>
      )}
    </Screen>
  );
}
