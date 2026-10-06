import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { T } from '@/components/ui';
import type { CoachProfile } from '@/lib/coaching';
import { F, usePalette } from '@/theme';

export function CoachAvatar({ coach, size = 56 }: { coach: Pick<CoachProfile, 'name' | 'photo_url'>; size?: number }) {
  const pal = usePalette();
  const initials = coach.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: pal.ink, alignItems: 'center', justifyContent: 'center' }}>
      {coach.photo_url ? (
        <Image source={{ uri: coach.photo_url }} style={{ width: size, height: size }} contentFit="cover" accessibilityLabel={`Photo of ${coach.name}`} />
      ) : (
        <Text style={{ fontFamily: F.black, fontSize: size * 0.38, color: pal.paper }}>{initials}</Text>
      )}
    </View>
  );
}

export function VerifiedBadge() {
  const pal = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pal.fat, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}
      accessibilityLabel="Verified coach">
      <Text style={{ fontFamily: F.black, fontSize: 11, color: pal.onGoal }}>✓ Verified</Text>
    </View>
  );
}

export function CoachCard({ coach, onPress }: { coach: CoachProfile; onPress?: () => void }) {
  const pal = usePalette();
  const topAward = coach.awards[0];
  const facts = [
    coach.years_experience != null ? `${coach.years_experience} ${coach.years_experience === 1 ? 'year' : 'years'} coaching` : null,
    coach.location || null,
    coach.certifications.length ? `${coach.certifications.length} ${coach.certifications.length === 1 ? 'certification' : 'certifications'}` : null,
  ].filter(Boolean);
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ backgroundColor: pal.surface, borderRadius: 18, borderWidth: 1, borderColor: pal.line, padding: 14, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <CoachAvatar coach={coach} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <T v="h3">{coach.name}</T>
            {coach.verified ? <VerifiedBadge /> : null}
          </View>
          {coach.headline ? <T v="small" numberOfLines={2}>{coach.headline}</T> : null}
          {facts.length ? <T v="tiny" color={pal.muted} style={{ marginTop: 2 }}>{facts.join(' · ')}</T> : null}
        </View>
      </View>
      {topAward ? (
        <T v="small" style={{ marginTop: 10 }}>🏆 {topAward.title}{topAward.org ? `, ${topAward.org}` : ''}{topAward.year ? ` (${topAward.year})` : ''}</T>
      ) : null}
      {coach.specialties.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {coach.specialties.slice(0, 4).map(s => (
            <View key={s} style={{ borderWidth: 1, borderColor: pal.line, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
              <T v="tiny">{s}</T>
            </View>
          ))}
        </View>
      ) : null}
      {!coach.accepting_clients ? <T v="tiny" color={pal.muted} style={{ marginTop: 8 }}>Not taking new clients right now</T> : null}
    </Pressable>
  );
}
