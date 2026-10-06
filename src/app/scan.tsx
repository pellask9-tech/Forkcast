import { Image } from 'expo-image';
import { ComingSoon } from '@/components/ComingSoon';
import { AI_FEATURES } from '@/config';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Btn, Chip, MacroLine, T } from '@/components/ui';
import { FOOD, Food } from '@/lib/foods';
import { clamp, fmt } from '@/lib/nutrition';
import { preparePhoto, scanPhoto } from '@/lib/scan-client';
import { SLOTS, SlotKey, addEntries, defaultSlot, todayStr, useAppState } from '@/lib/store';
import { FREE_SCANS_PER_DAY, canScan, countScan, scansLeftToday } from '@/lib/subscription';
import { F, usePalette } from '@/theme';

interface Item {
  name: string;
  portion: string;
  conf: string;
  grams: number;
  perGram: number[];
  match: Food | null;
  on: boolean;
}
type Phase = 'pick' | 'busy' | 'review' | 'error';

const CONF: Record<string, string> = { high: 'Clear view', medium: 'Best guess', low: 'Hard to see, check the amount' };

export default function ScanScreen() {
  return AI_FEATURES ? <ScanScreenInner /> : <ComingSoon title="Scan a meal" />;
}

function ScanScreenInner() {
  const pal = usePalette();
  const app = useAppState();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date || todayStr();
  const [phase, setPhase] = useState<Phase>('pick');
  const [uri, setUri] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState('');
  const [slot, setSlot] = useState<SlotKey>(defaultSlot());
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => () => ctl.current?.abort(), []);

  const left = scansLeftToday();
  const allowed = app.pro || canScan();

  async function pick(source: 'camera' | 'library') {
    if (!allowed) { router.push('/paywall'); return; }
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setPhase('error');
        setMsg(perm.canAskAgain ? 'Camera access is needed to scan a meal.' : 'Camera access is turned off for this app. Turn it on in Settings, or choose a photo instead.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    }
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    run(asset.uri, asset.width);
  }

  async function run(photoUri: string, width: number) {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setUri(photoUri);
    setItems([]);
    setPhase('busy');
    setMsg('This usually takes 10 to 30 seconds.');
    try {
      const b64 = await preparePhoto(photoUri, width);
      const res = await scanPhoto(b64, c.signal);
      if (c.signal.aborted) return;
      countScan();
      const next: Item[] = res.items.map(it => {
        const m = it.match && FOOD[it.match] && FOOD[it.match].unit.kind === 'std' ? FOOD[it.match] : null;
        const grams = clamp(Math.round(it.grams), 1, 3000);
        const perGram = m && m.unit.kind === 'std' ? m.n.map(v => v / (m.unit as { g: number }).g) : it.n.map(v => v / grams);
        return { name: it.name, portion: it.portion, conf: CONF[it.confidence] ?? 'Best guess', grams, perGram, match: m, on: true };
      });
      setItems(next);
      setPhase('review');
      setMsg(next.length ? `${res.note ? res.note + ' ' : ''}Adjust the grams if they look off, then add.` : res.note || 'No food found. Try a closer photo from above with the whole plate in view.');
    } catch (e: any) {
      if (c.signal.aborted || e?.name === 'AbortError') return;
      setPhase('error');
      setMsg(e?.message || 'The scan failed. Try again.');
    }
  }

  const cancel = () => { ctl.current?.abort(); setPhase('pick'); setUri(null); };
  const nOf = (it: Item) => it.perGram.map(v => v * it.grams);
  const selected = items.filter(i => i.on && i.grams > 0);
  const sum = selected.reduce((a, it) => { const n = nOf(it); return a.map((v, i) => v + n[i]); }, new Array(18).fill(0));

  const addAll = () => {
    addEntries(date, selected.map(it => it.match && it.match.unit.kind === 'std'
      ? { fid: it.match.id, name: it.match.name, unit: it.match.unit, n: it.match.n.slice(), s: +(it.grams / it.match.unit.g).toFixed(3), slot, via: 'photo' as const }
      : { fid: 'scan', name: it.name, unit: { kind: 'scan' as const, grams: it.grams }, n: nOf(it).map(v => +v.toFixed(2)), s: 1, slot, via: 'photo' as const }));
    router.back();
  };

  return (
    <Screen modal>
      <T v="h2">Scan a meal</T>
      <T v="small" color={pal.muted} style={{ marginTop: 4 }}>
        {app.pro ? 'Pro: unlimited scans.' : `${left} of ${FREE_SCANS_PER_DAY} free scans left today.`} Photos are sent to your scan server for analysis.
      </T>

      {uri ? (
        <View style={{ marginTop: 16, borderRadius: 18, overflow: 'hidden', backgroundColor: pal.soft }}>
          <Image source={{ uri }} style={{ width: '100%', aspectRatio: 4 / 3 }} contentFit="cover" accessibilityLabel="Your meal photo" />
          {phase === 'busy' ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', gap: 10 }]}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={{ fontFamily: F.bold, color: '#fff', fontSize: 16 }}>Looking at your photo…</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {phase === 'pick' ? (
        allowed ? (
          <View style={{ gap: 10, marginTop: 20 }}>
            <Btn title="Take a photo" onPress={() => pick('camera')} />
            <Btn title="Choose from photos" kind="ghost" onPress={() => pick('library')} />
            <T v="small" color={pal.muted} style={{ marginTop: 6 }}>Shoot from above in good light with the whole plate in view. A fork or hand in the frame helps with portion size.</T>
          </View>
        ) : (
          <View style={{ marginTop: 20, gap: 10, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: pal.ink, backgroundColor: pal.surface }}>
            <T v="h3">You’ve used today’s free scans</T>
            <T v="small" color={pal.muted}>Free scans reset tomorrow. Pro gives you unlimited scans. You can still search and log foods by hand.</T>
            <Btn title="See Pro plans" onPress={() => router.push('/paywall')} style={{ alignSelf: 'flex-start' }} />
          </View>
        )
      ) : null}

      {phase === 'busy' ? (
        <View style={{ marginTop: 14, gap: 10 }}>
          <T v="small" color={pal.muted}>{msg}</T>
          <Btn title="Cancel" kind="ghost" small onPress={cancel} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}

      {phase === 'error' ? (
        <View style={{ marginTop: 16, gap: 12 }}>
          <T v="h3">Couldn’t scan that photo</T>
          <T color={pal.muted}>{msg}</T>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Btn title="Try again" onPress={() => { setPhase('pick'); setUri(null); }} />
            {msg.includes('Settings') ? <Btn title="Open Settings" kind="ghost" onPress={() => Linking.openSettings()} /> : null}
          </View>
        </View>
      ) : null}

      {phase === 'review' ? (
        <View style={{ marginTop: 16 }}>
          <T v="h3">{items.length === 1 ? 'Found 1 food' : items.length ? `Found ${items.length} foods` : 'No food found'}</T>
          <T v="small" color={pal.muted} style={{ marginTop: 3, marginBottom: 8 }}>{msg}</T>
          {items.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: pal.line, opacity: it.on ? 1 : 0.45 }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: it.on }}
                accessibilityLabel={`Include ${it.name}`}
                onPress={() => setItems(prev => prev.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
                style={{ width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: pal.ink, backgroundColor: it.on ? pal.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {it.on ? <Text style={{ color: pal.paper, fontFamily: F.black, fontSize: 15 }}>✓</Text> : null}
              </Pressable>
              <View style={{ flex: 1 }}>
                <T>{it.name}</T>
                <T v="tiny" color={pal.muted}>{[it.portion, it.conf].filter(Boolean).join('. ')}</T>
              </View>
              <View style={{ width: 82, justifyContent: 'center' }}>
                <TextInput
                  keyboardType="number-pad"
                  value={String(it.grams)}
                  accessibilityLabel={`Grams of ${it.name}`}
                  onChangeText={t => setItems(prev => prev.map((x, j) => (j === i ? { ...x, grams: clamp(parseInt(t, 10) || 0, 0, 3000) } : x)))}
                  style={{ fontFamily: F.medium, fontSize: 16, color: pal.ink, borderWidth: 1.5, borderColor: pal.line, borderRadius: 10, paddingVertical: 8, paddingLeft: 10, paddingRight: 24, backgroundColor: pal.surface }}
                />
                <Text style={{ position: 'absolute', right: 9, fontFamily: F.regular, color: pal.muted }} pointerEvents="none">g</Text>
              </View>
              <T v="label" style={{ width: 62, textAlign: 'right' }}>{fmt(nOf(it)[0])}</T>
            </View>
          ))}
          {items.length ? (
            <>
              <T v="h3" style={{ marginTop: 14 }}>{fmt(sum[0])} kcal</T>
              <MacroLine p={sum[1]} c={sum[2]} f={sum[3]} style={{ marginTop: 4 }} />
              <T v="label" style={{ marginTop: 18, marginBottom: 8 }}>Meal</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SLOTS.map(([k, l]) => <Chip key={k} label={l} selected={k === slot} onPress={() => setSlot(k)} />)}
              </View>
              <Btn title="Add to log" style={{ marginTop: 22 }} disabled={!selected.length} onPress={addAll} />
            </>
          ) : null}
          <Btn title="Scan another photo" kind="ghost" style={{ marginTop: 10 }} onPress={() => { setPhase('pick'); setUri(null); setItems([]); }} />
        </View>
      ) : null}
    </Screen>
  );
}
