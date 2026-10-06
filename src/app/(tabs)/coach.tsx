import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { CoachAvatar, CoachCard, VerifiedBadge } from '@/components/CoachCard';
import { AppHeader, Screen } from '@/components/Screen';
import { Btn, NoteBox, SectionRule, T } from '@/components/ui';
import { COACHING } from '@/config';
import {
  getCoach, leaveCoach, listCoaches, listNotes, myClients, myCoachProfile, pushSnapshot, refreshMyLink,
  respondToRequest, setRole, signOut, useCoaching,
  type ClientRow, type CoachProfile, type Note,
} from '@/lib/coaching';
import { usePalette } from '@/theme';

export default function CoachTab() {
  const pal = usePalette();
  const me = useCoaching();
  if (!COACHING) {
    return (
      <Screen>
        <AppHeader />
        <T v="title">Coaching</T>
        <T color={pal.muted} style={{ marginTop: 8 }}>Coaching is coming after the beta.</T>
      </Screen>
    );
  }
  return (
    <Screen>
      <AppHeader />
      {!me.ready ? <ActivityIndicator color={pal.ink} style={{ marginTop: 40 }} />
        : !me.userId ? <SignedOut />
        : me.role === 'coach' ? <CoachDashboard />
        : <MemberView />}
    </Screen>
  );
}

/* ---------------- Directory (shared) ---------------- */
function Directory() {
  const pal = usePalette();
  const [coaches, setCoaches] = useState<CoachProfile[] | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    listCoaches().then(c => { setCoaches(c); setError(''); }).catch(e => setError(e?.message ?? 'Couldn’t load coaches.'));
  }, []));
  if (error) return <View style={{ marginTop: 12 }}><NoteBox warn text={error} /></View>;
  if (!coaches) return <ActivityIndicator color={pal.ink} style={{ marginTop: 20 }} />;
  if (!coaches.length) return <T color={pal.muted} style={{ marginTop: 10 }}>No coaches have published a profile yet. Check back soon.</T>;
  return (
    <View style={{ gap: 12, marginTop: 12 }}>
      {coaches.map(c => <CoachCard key={c.id} coach={c} onPress={() => router.push({ pathname: '/coaches/[id]', params: { id: c.id } })} />)}
    </View>
  );
}

/* ---------------- Signed out ---------------- */
function SignedOut() {
  const pal = usePalette();
  return (
    <>
      <T v="title">Train with a coach</T>
      <T color={pal.muted} style={{ marginTop: 8 }}>
        Pick a certified coach who sees your food log, body check and workouts, and sends you notes to keep you on track.
      </T>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <Btn title="Sign in or join" onPress={() => router.push('/account')} />
        <Btn title="I’m a coach" kind="ghost" onPress={() => router.push({ pathname: '/account', params: { role: 'coach' } })} />
      </View>
      <SectionRule />
      <T v="h2">Coaches</T>
      <Directory />
    </>
  );
}

/* ---------------- Member ---------------- */
function MemberView() {
  const pal = usePalette();
  const me = useCoaching();
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [shared, setShared] = useState('');
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    refreshMyLink()
      .then(async link => {
        setCoach(link ? await getCoach(link.coach_id) : null);
        setNotes(link?.status === 'active' && me.userId ? await listNotes(me.userId) : []);
      })
      .catch(e => setError(e?.message ?? 'Couldn’t load your coach.'));
  }, [me.userId]));

  const link = me.link;
  function leave() {
    const active = link?.status === 'active';
    Alert.alert(active ? 'End coaching?' : 'Cancel request?', active ? 'Your coach will no longer see your progress, and what you shared is deleted.' : undefined, [
      { text: 'Keep', style: 'cancel' },
      { text: active ? 'End coaching' : 'Cancel request', style: 'destructive', onPress: () => leaveCoach().catch(e => setError(e?.message ?? 'Something went wrong.')) },
    ]);
  }
  async function share() {
    setError('');
    try {
      await pushSnapshot();
      setShared('Shared just now.');
    } catch (e: any) {
      setError(e?.message ?? 'Couldn’t share your progress.');
    }
  }

  return (
    <>
      <T v="title">{link?.status === 'active' ? 'Your coach' : 'Find your coach'}</T>
      {error ? <View style={{ marginTop: 12 }}><NoteBox warn text={error} /></View> : null}

      {link && coach ? (
        <View style={{ marginTop: 14, gap: 12 }}>
          <CoachCard coach={coach} onPress={() => router.push({ pathname: '/coaches/[id]', params: { id: coach.id } })} />
          {link.status === 'pending' ? (
            <NoteBox text={`Request sent to ${coach.name}. Once they accept, they’ll see your progress and can send you notes here.`} />
          ) : (
            <>
              <T v="h2" style={{ marginTop: 8 }}>Notes from {coach.name.split(' ')[0]}</T>
              {notes.length ? notes.map(n => (
                <View key={n.id} style={{ padding: 12, borderRadius: 14, backgroundColor: pal.surface, borderWidth: 1, borderColor: pal.line }}>
                  <T v="tiny" color={pal.muted}>{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</T>
                  <T style={{ marginTop: 2 }}>{n.body}</T>
                </View>
              )) : <T color={pal.muted}>No notes yet. Keep logging and your coach will check in.</T>}
              <T v="small" color={pal.muted} style={{ marginTop: 6 }}>
                Your coach sees your goal and targets, daily calorie and protein totals, weight, body check results (not photos) and workout progress. It updates automatically as you log.
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Btn title="Share latest now" kind="ghost" small onPress={share} />
                {shared ? <T v="small" color={pal.muted}>{shared}</T> : null}
              </View>
            </>
          )}
          <Btn title={link.status === 'active' ? 'End coaching' : 'Cancel request'} kind="ghost" small style={{ alignSelf: 'flex-start' }} onPress={leave} />
        </View>
      ) : (
        <>
          <T color={pal.muted} style={{ marginTop: 8 }}>Tap a coach to see their certifications and awards, then send a request.</T>
          <Directory />
        </>
      )}

      <AccountFooter />
    </>
  );
}

/* ---------------- Coach ---------------- */
function CoachDashboard() {
  const pal = usePalette();
  const [profile, setProfile] = useState<CoachProfile | null | undefined>(undefined);
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([myCoachProfile(), myClients()])
      .then(([p, c]) => { setProfile(p); setClients(c); setError(''); })
      .catch(e => setError(e?.message ?? 'Couldn’t load your dashboard.'));
  }, []);
  useFocusEffect(load);

  const respond = (id: string, accept: boolean) =>
    respondToRequest(id, accept).then(load).catch(e => setError(e?.message ?? 'Something went wrong.'));
  const requests = clients?.filter(c => c.status === 'pending') ?? [];
  const active = clients?.filter(c => c.status === 'active') ?? [];

  return (
    <>
      <T v="title">Coach dashboard</T>
      <NoteBox color={pal.fat} text="Coach accounts unlock every Forkcast Pro feature, free." />
      {error ? <View style={{ marginTop: 12 }}><NoteBox warn text={error} /></View> : null}

      <SectionRule />
      <T v="h2">Your profile</T>
      {profile === undefined ? <ActivityIndicator color={pal.ink} style={{ marginTop: 12 }} /> : profile ? (
        <View style={{ marginTop: 10, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <CoachAvatar coach={profile} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <T v="h3">{profile.name}</T>
                {profile.verified ? <VerifiedBadge /> : null}
              </View>
              <T v="small" color={pal.muted}>
                {profile.published ? 'Live in the coach directory' : 'Draft, only you can see it'}
                {profile.accepting_clients ? '' : ' · not taking new clients'}
              </T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn title="Edit profile" small onPress={() => router.push('/coach-edit')} />
            <Btn title="View as members do" kind="ghost" small onPress={() => router.push({ pathname: '/coaches/[id]', params: { id: profile.id } })} />
          </View>
        </View>
      ) : (
        <>
          <T color={pal.muted} style={{ marginTop: 6 }}>Add your photo, certifications and awards so members can find you.</T>
          <Btn title="Create your coach profile" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.push('/coach-edit')} />
        </>
      )}

      <SectionRule />
      <T v="h2">Requests{requests.length ? ` (${requests.length})` : ''}</T>
      {clients === null ? null : requests.length ? requests.map(r => (
        <View key={r.id} style={{ marginTop: 10, padding: 14, borderRadius: 16, backgroundColor: pal.surface, borderWidth: 1, borderColor: pal.line, gap: 8 }}>
          <T v="h3">{r.name}</T>
          {r.message ? <T v="small">“{r.message}”</T> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn title="Accept" small onPress={() => respond(r.id, true)} />
            <Btn title="Decline" kind="ghost" small onPress={() => respond(r.id, false)} />
          </View>
        </View>
      )) : <T color={pal.muted} style={{ marginTop: 6 }}>No new requests.</T>}

      <SectionRule />
      <T v="h2">Clients{active.length ? ` (${active.length})` : ''}</T>
      {clients === null ? null : active.length ? active.map(c => (
        <Pressable key={c.id} accessibilityRole="button"
          onPress={() => router.push({ pathname: '/client/[id]', params: { id: c.client_id, name: c.name, link: c.id } })}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: pal.line }}>
          <T v="label">{c.name}</T>
          <T v="small" color={pal.muted}>View progress ›</T>
        </Pressable>
      )) : <T color={pal.muted} style={{ marginTop: 6 }}>Clients you accept appear here.</T>}

      <AccountFooter />
    </>
  );
}

/* ---------------- Account footer ---------------- */
function AccountFooter() {
  const pal = usePalette();
  const me = useCoaching();
  const [error, setError] = useState('');
  const switchRole = () => {
    const toCoach = me.role !== 'coach';
    Alert.alert(toCoach ? 'Become a coach?' : 'Switch to a member account?',
      toCoach ? 'You’ll be able to build a coach profile and take on clients.' : 'Your coach profile will be hidden from the directory.', [
        { text: 'Cancel', style: 'cancel' },
        { text: toCoach ? 'Become a coach' : 'Switch', onPress: () => setRole(toCoach ? 'coach' : 'member').then(() => { if (toCoach) router.push('/coach-edit'); }).catch(e => setError(e?.message ?? 'Couldn’t switch.')) },
      ]);
  };
  return (
    <>
      <SectionRule />
      <T v="small" color={pal.muted}>Signed in as {me.email}</T>
      {error ? <View style={{ marginTop: 8 }}><NoteBox warn text={error} /></View> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <Btn title="Sign out" kind="ghost" small onPress={() => signOut()} />
        {!(me.role === 'member' && me.link) ? (
          <Btn title={me.role === 'coach' ? 'Switch to member account' : 'I’m a coach'} kind="ghost" small onPress={switchRole} />
        ) : null}
      </View>
    </>
  );
}
