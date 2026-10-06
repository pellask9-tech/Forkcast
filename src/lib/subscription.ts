/**
 * Subscriptions.
 *
 * Expo Go can't run real App Store / Google Play purchases, so this file is a TEST STORE:
 * "buying" a plan just flips a flag on the device, and no money moves. That lets you build and
 * test the whole paywall flow in Expo Go.
 *
 * For real payments (in a development build or the store release), swap the three functions below
 * for RevenueCat (react-native-purchases). The README has the step-by-step. The rest of the app
 * only calls purchasePlan(), restorePurchases() and canScan(), so nothing else needs to change.
 *
 * IMPORTANT for production: the free-scan limit here is checked on the phone, which a determined
 * user could get around. Check the user's subscription on your server (in src/app/api/scan+api.ts)
 * before calling the AI, because every scan costs you money.
 */
import { PAYWALL } from '@/config';
import { parseD, readState, recordScan, scansUsedToday, setPro, todayStr } from './store';

export const FREE_SCANS_PER_DAY = 2;
/** Free users get one body check every 7 days. */
export const FREE_BODY_CHECK_DAYS = 7;

// Placeholder prices. With RevenueCat, the stores give you the real, localized price strings.
export const PLANS = [
  { id: 'pro_yearly', title: 'Yearly', price: '$29.99', period: 'per year', note: 'Save 37%' },
  { id: 'pro_monthly', title: 'Monthly', price: '$3.99', period: 'per month', note: '' },
] as const;
export type PlanId = (typeof PLANS)[number]['id'];

export const IS_TEST_STORE = true;

export async function purchasePlan(planId: PlanId): Promise<boolean> {
  // RevenueCat version:
  //   const offerings = await Purchases.getOfferings();
  //   const pkg = offerings.current?.availablePackages.find(p => p.product.identifier === planId);
  //   const { customerInfo } = await Purchases.purchasePackage(pkg!);
  //   const active = !!customerInfo.entitlements.active['pro'];
  await new Promise(r => setTimeout(r, 600));
  setPro(true, planId);
  return true;
}

export async function restorePurchases(): Promise<boolean> {
  // RevenueCat version:
  //   const info = await Purchases.restorePurchases();
  //   return !!info.entitlements.active['pro'];
  return readState().pro;
}

/** Test-store only: go back to the free tier so you can test the paywall again. */
export function resetTestPurchase() {
  setPro(false, null);
}

export function scansLeftToday(): number {
  if (!PAYWALL) return Infinity;
  return readState().pro ? Infinity : Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday());
}
export function canScan(): boolean {
  return scansLeftToday() > 0;
}
export function countScan() {
  if (PAYWALL && !readState().pro) recordScan();
}

/** Days until a free user can run another body check (0 = allowed now). */
export function bodyCheckWaitDays(): number {
  const st = readState();
  if (!PAYWALL || st.pro || !st.bodyChecks.length) return 0;
  const last = parseD(st.bodyChecks[st.bodyChecks.length - 1].d).getTime();
  const days = Math.round((parseD(todayStr()).getTime() - last) / 86400000);
  return Math.max(0, FREE_BODY_CHECK_DAYS - days);
}
