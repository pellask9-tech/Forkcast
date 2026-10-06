import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ComingSoon } from '@/components/ComingSoon';
import { Screen } from '@/components/Screen';
import { Btn, Field, NoteBox, Segmented, T } from '@/components/ui';
import { COACHING } from '@/config';
import { signIn, signUp, type Role } from '@/lib/coaching';
import { usePalette } from '@/theme';

export default function AccountScreen() {
  return COACHING ? <AccountInner /> : <ComingSoon title="Coaching" />;
}

function AccountInner() {
  const pal = usePalette();
  const params = useLocalSearchParams<{ role?: string }>();
  const [mode, setMode] = useState<'signin' | 'signup'>(params.role ? 'signup' : 'signin');
  const [role, setRole] = useState<Role>(params.role === 'coach' ? 'coach' : 'member');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit() {
    setError('');
    setInfo('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Use a password with at least 6 characters.');
    if (mode === 'signup' && name.trim().length < 2) return setError('Add your name so your coach or clients know who you are.');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        router.back();
      } else {
        const { needsConfirm } = await signUp(email, password, role, name);
        if (needsConfirm) {
          setMode('signin');
          setInfo(`We sent a confirmation link to ${email.trim()}. Open it, then sign in here.`);
        } else {
          router.back();
          if (role === 'coach') router.push('/coach-edit');
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen modal>
      <T v="small" color={pal.muted}>Coaching</T>
      <T v="title">{mode === 'signin' ? 'Sign in' : 'Create your account'}</T>
      <T color={pal.muted} style={{ marginTop: 8 }}>
        {mode === 'signin'
          ? 'Sign in to work with your coach, or to manage your clients if you’re a coach.'
          : 'An account lets you connect with a coach, or coach other Forkcast members.'}
      </T>

      <View style={{ marginTop: 18 }}>
        <Segmented
          options={[{ value: 'signin', label: 'Sign in' }, { value: 'signup', label: 'Create account' }]}
          value={mode}
          onChange={m => { setMode(m); setError(''); setInfo(''); }}
        />
      </View>

      <View style={{ gap: 14, marginTop: 18 }}>
        {mode === 'signup' ? (
          <>
            <View>
              <T v="label" style={{ marginBottom: 8 }}>I’m joining as</T>
              <Segmented<Role>
                options={[{ value: 'member', label: 'A member' }, { value: 'coach', label: 'A coach' }]}
                value={role}
                onChange={setRole}
              />
              <T v="small" color={pal.muted} style={{ marginTop: 8 }}>
                {role === 'coach'
                  ? 'You’ll build a public profile with your certifications and awards, take on clients, see their progress, and get every Pro feature free.'
                  : 'You can browse coaches, send a request, and share your progress with the coach you choose.'}
              </T>
            </View>
            <Field label={role === 'coach' ? 'Your name, as clients will see it' : 'Your name'} value={name} onChangeText={setName}
              autoCapitalize="words" autoComplete="name" placeholder="e.g. Ana Cruz" />
          </>
        ) : null}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
          keyboardType="email-address" placeholder="you@example.com" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="At least 6 characters" onSubmitEditing={submit} />
      </View>

      {error ? <View style={{ marginTop: 16 }}><NoteBox warn text={error} /></View> : null}
      {info ? <View style={{ marginTop: 16 }}><NoteBox text={info} color={pal.fat} /></View> : null}

      <Btn title={mode === 'signin' ? 'Sign in' : 'Create account'} loading={busy} style={{ marginTop: 20 }} onPress={submit} />
      <T v="tiny" color={pal.muted} style={{ marginTop: 14 }}>
        Your food log stays on your phone. Only when you connect with a coach does Forkcast share a summary of your progress with them, and you can stop at any time.
      </T>
    </Screen>
  );
}
