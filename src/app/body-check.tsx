import { Image } from 'expo-image';
import { ComingSoon } from '@/components/ComingSoon';
import { AI_FEATURES } from '@/config';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { BodyCheckResult } from '@/components/BodyCheckResult';
import { Screen } from '@/components/Screen';
import { Btn, NoteBox, T } from '@/components/ui';
import { PhysiqueResult, checkPhysique } from '@/lib/physique-client';
import { preparePhoto } from '@/lib/scan-client';
import { saveBodyCheck, useAppState } from '@/lib/store';
import { FREE_BODY_CHECK_DAYS, bodyCheckWaitDays } from '@/lib/subscription';
import { F, usePalette } from '@/theme';

type View_ = 'front' | 'back';
type Photo = { uri: string; width: number };
type Phase = 'setup' | 'busy' | 'result' | 'blocked' | 'error';

export default function BodyCheckScreen() {
  return AI_FEATURES ? <BodyCheckInner /> : <ComingSoon title="Body check" />;
}

function BodyCheckInner() {
  const pal = usePalette();
  const app = useAppState();
  const [photos, setPhotos] = useState<Partial<Record<View_, Photo>>>({});
  const [phase, setPhase] = useState<Phase>('setup');
  const [result, setResult] = useState<Extract<PhysiqueResult, { ok: true }> | null>(null);
  const [msg, setMsg] = useState('');
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);

  const wait = bodyCheckWaitDays();

  if (!app.profile) {
    return (
      <Screen modal>
        <T v="h2">Body check</T>
        <T color={pal.muted} style={{ marginTop: 8, marginBottom: 18 }}>Set up your body stats first. The check uses your goal, age and sex to pick the right exercises.</T>
        <Btn title="Set up body stats" onPress={() => { router.back(); router.navigate('/body'); }} />
      </Screen>
    );
  }
  const profile = app.profile;

  async function pick(view: View_, source: 'camera' | 'library') {
    let res: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera is off', 'Allow camera access in Settings, or choose a photo instead.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      res = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8, cameraType: ImagePicker.CameraType.front });
    } else {
      res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    }
    const a = res.canceled ? null : res.assets?.[0];
    if (a) setPhotos(p => ({ ...p, [view]: { uri: a.uri, width: a.width } }));
  }

  const choose = (view: View_) =>
    Alert.alert(view === 'front' ? 'Front photo' : 'Back photo', undefined, [
      { text: 'Take a photo', onPress: () => pick(view, 'camera') },
      { text: 'Choose from photos', onPress: () => pick(view, 'library') },
      ...(photos[view] ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => setPhotos(p => ({ ...p, [view]: undefined })) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  async function run() {
    const front = photos.front;
    if (!front) return;
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setPhase('busy');
    try {
      const imgs: { data: string; view: View_ }[] = [{ data: await preparePhoto(front.uri, front.width), view: 'front' }];
      if (photos.back) imgs.push({ data: await preparePhoto(photos.back.uri, photos.back.width), view: 'back' });
      const r = await checkPhysique(imgs, { goal: profile.goal, sex: profile.sex, age: profile.age }, c.signal);
      if (c.signal.aborted) return;
      if (r.ok) {
        saveBodyCheck({ summary: r.summary, groups: r.groups, focus: r.focus, balance: r.balance, views: imgs.map(i => i.view) });
        setResult(r);
        setPhase('result');
      } else {
        setMsg(r.message);
        setPhase('blocked');
      }
    } catch (e: any) {
      if (c.signal.aborted || e?.name === 'AbortError') return;
      setMsg(e?.message || 'Something went wrong. Try again.');
      setPhase('error');
    }
  }

  if (phase === 'result' && result) {
    return (
      <Screen modal>
        <T v="small" color={pal.muted}>Body check</T>
        <T v="title" style={{ marginBottom: 12 }}>Your results</T>
        <BodyCheckResult check={result} />
        <T v="tiny" color={pal.muted} style={{ marginTop: 18 }}>Saved to your body check history. Photos were not saved. This is training guidance, not medical advice.</T>
        <Btn title="Get my weekly program" style={{ marginTop: 18 }} onPress={() => { router.back(); router.push('/program'); }} />
        <Btn title="Done" kind="ghost" style={{ marginTop: 10 }} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen modal>
      <T v="small" color={pal.muted}>Body check</T>
      <T v="title">See what to train next</T>
      <T color={pal.muted} style={{ marginTop: 8 }}>
        Take a photo of yourself and get a muscle-by-muscle read on what’s strong and what needs more work, with exercises for your {profile.goal === 'bulk' ? 'bulk' : 'cut'}.
      </T>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <Slot pal={pal} label="Front" hint="Required" photo={photos.front} onPress={() => choose('front')} disabled={phase === 'busy'} />
        <Slot pal={pal} label="Back" hint="Optional, rates back and legs" photo={photos.back} onPress={() => choose('back')} disabled={phase === 'busy'} />
      </View>

      <View style={{ marginTop: 18, gap: 6 }}>
        <T v="label">For the best read</T>
        {['Wear gym clothes, shorts or swimwear', 'Stand straight, arms slightly away from your body', 'Good light, whole body in frame, camera at chest height', 'Use the same pose each time to compare progress'].map(t => (
          <View key={t} style={{ flexDirection: 'row', gap: 8 }}>
            <T v="small" color={pal.muted}>•</T>
            <T v="small" color={pal.muted} style={{ flex: 1 }}>{t}</T>
          </View>
        ))}
      </View>

      {phase === 'blocked' || phase === 'error' ? (
        <View style={{ marginTop: 18 }}>
          <NoteBox warn text={msg} />
        </View>
      ) : null}

      {phase === 'busy' ? (
        <View style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ActivityIndicator color={pal.ink} />
          <T style={{ flex: 1 }}>Looking at your photos… this takes 10 to 40 seconds.</T>
          <Btn title="Cancel" kind="ghost" small onPress={() => { ctl.current?.abort(); setPhase('setup'); }} />
        </View>
      ) : wait > 0 ? (
        <View style={{ marginTop: 22, gap: 10, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: pal.ink, backgroundColor: pal.surface }}>
          <T v="h3">Next free check in {wait} {wait === 1 ? 'day' : 'days'}</T>
          <T v="small" color={pal.muted}>Free accounts get one body check every {FREE_BODY_CHECK_DAYS} days. Pro gives you unlimited checks.</T>
          <Btn title="See Pro plans" onPress={() => router.push('/paywall')} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : (
        <Btn title="Check my body" style={{ marginTop: 22 }} disabled={!photos.front} onPress={run} />
      )}

      <T v="tiny" color={pal.muted} style={{ marginTop: 16 }}>
        For adults 18 and over. Photos are sent to your server for this one check and are not saved. Results are training guidance, not medical advice.
      </T>
    </Screen>
  );
}

function Slot({ pal, label, hint, photo, onPress, disabled }: { pal: ReturnType<typeof usePalette>; label: string; hint: string; photo?: Photo; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label} photo${photo ? ', selected' : ''}`}
      style={{ flex: 1, aspectRatio: 3 / 4, borderRadius: 20, overflow: 'hidden', borderWidth: photo ? 0 : 2, borderStyle: 'dashed', borderColor: pal.line, backgroundColor: pal.surface, alignItems: 'center', justifyContent: 'center' }}>
      {photo ? (
        <>
          <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={{ position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 12, color: '#fff' }}>{label}, tap to change</Text>
          </View>
        </>
      ) : (
        <View style={{ alignItems: 'center', paddingHorizontal: 10 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: pal.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 26, lineHeight: 30, color: pal.paper }}>+</Text>
          </View>
          <T v="h3">{label}</T>
          <T v="tiny" color={pal.muted} style={{ textAlign: 'center' }}>{hint}</T>
        </View>
      )}
    </Pressable>
  );
}
