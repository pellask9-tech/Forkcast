import { router } from 'expo-router';
import { ComingSoon } from '@/components/ComingSoon';
import { PAYWALL } from '@/config';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Btn, T } from '@/components/ui';
import { useAppState } from '@/lib/store';
import { FREE_BODY_CHECK_DAYS, FREE_SCANS_PER_DAY, IS_TEST_STORE, PLANS, PlanId, purchasePlan, restorePurchases } from '@/lib/subscription';
import { F, usePalette } from '@/theme';

export default function PaywallScreen() {
  return PAYWALL ? <PaywallInner /> : <ComingSoon title="Forkcast Pro" />;
}

function PaywallInner() {
  const pal = usePalette();
  const app = useAppState();
  const [plan, setPlan] = useState<PlanId>('pro_yearly');
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    const go = async () => {
      setBusy(true);
      try {
        const ok = await purchasePlan(plan);
        if (ok) router.back();
      } catch {
        Alert.alert('Purchase failed', 'Nothing was charged. Please try again.');
      } finally {
        setBusy(false);
      }
    };
    if (IS_TEST_STORE) {
      Alert.alert('Test purchase', 'This is a test store for Expo Go. No money is charged.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Buy (test)', onPress: go },
      ]);
    } else {
      go();
    }
  };

  const restore = async () => {
    const ok = await restorePurchases();
    Alert.alert(ok ? 'Pro restored' : 'No purchase found', ok ? 'Unlimited scans are back on.' : 'We couldn’t find a Pro subscription for this account.');
  };

  const perks = [
    ['Unlimited meal scans', `Free accounts get ${FREE_SCANS_PER_DAY} scans a day.`],
    ['Unlimited body checks', `See which muscles to train as often as you like. Free accounts get one every ${FREE_BODY_CHECK_DAYS} days.`],
    ['Full nutrition from every photo', 'Calories, macros, and 10 vitamins and minerals per food.'],
    ['Everything else stays free', 'Logging, BMI, targets and your meal plan.'],
  ];

  return (
    <Screen modal>
      <Text style={{ fontFamily: F.black, fontSize: 40, lineHeight: 42, letterSpacing: -1.2, color: pal.ink }}>Forkcast Pro</Text>
      <T color={pal.muted} style={{ marginTop: 8 }}>Log whole meals from a photo and see exactly which muscles to train next.</T>

      <View style={{ marginTop: 22, gap: 14 }}>
        {perks.map(([h, b]) => (
          <View key={h} style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontFamily: F.black, fontSize: 18, color: pal.ink }}>✓</Text>
            <View style={{ flex: 1 }}>
              <T v="label">{h}</T>
              <T v="small" color={pal.muted}>{b}</T>
            </View>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 26, gap: 10 }}>
        {PLANS.map(p => {
          const sel = p.id === plan;
          return (
            <Pressable key={p.id} onPress={() => setPlan(p.id)} accessibilityRole="radio" accessibilityState={{ selected: sel }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: sel ? pal.ink : pal.line, backgroundColor: pal.surface, borderRadius: 16, padding: 16 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: pal.ink, alignItems: 'center', justifyContent: 'center' }}>
                {sel ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: pal.ink }} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <T v="h3">{p.title}</T>
                {p.note ? <T v="tiny" color={pal.fat}>{p.note}</T> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T v="h3">{p.price}</T>
                <T v="tiny" color={pal.muted}>{p.period}</T>
              </View>
            </Pressable>
          );
        })}
      </View>

      {app.pro ? (
        <T v="label" style={{ marginTop: 22 }}>You already have Pro.</T>
      ) : (
        <Btn title="Start Pro" style={{ marginTop: 22 }} loading={busy} onPress={buy} />
      )}
      <Btn title="Restore purchases" kind="ghost" small style={{ marginTop: 10, alignSelf: 'center' }} onPress={restore} />
      <T v="tiny" color={pal.muted} style={{ marginTop: 16, textAlign: 'center' }}>
        {IS_TEST_STORE
          ? 'Test mode: purchases are simulated in Expo Go and nothing is charged.'
          : 'Subscriptions renew automatically until cancelled in your App Store or Google Play settings.'}
      </T>
    </Screen>
  );
}
