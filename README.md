# Forkcast

A calorie, macro and micronutrient tracker with BMI-based targets, cut/bulk meal plans,
AI photo scanning and a subscription paywall. Built with Expo (SDK 57) and Expo Router.

## What's inside

| Screen | What it does |
| --- | --- |
| **Today** | Nutrition Facts label for the day (calories, macros, fiber, sugars, sodium, 10 vitamins and minerals), meal log, search and scan buttons |
| **Meal plan** | A full day of meals sized to your targets, with swap, shuffle and "log to today" |
| **Body** | Goal (cut or bulk), pace, stats, BMI with scale, calorie and macro targets, weight log, Pro status |
| **Scan** (modal) | Take or pick a photo, Claude identifies each food and estimates grams and nutrients, you review and add |
| **Paywall** (modal) | Pro plans. Uses a test store in Expo Go, so no money moves |

The scan server lives in `src/app/api/scan+api.ts`. It runs on your computer while `npx expo start`
is running, so your API key never ships inside the app.

## Run it in Expo Go

You need Node.js 20 or newer on your computer and the **Expo Go** app on your phone
(App Store or Google Play). Your phone and computer must be on the same Wi-Fi.

```bash
npm install
cp .env.example .env.local      # then open .env.local and paste your ANTHROPIC_API_KEY
npx expo start
```

Scan the QR code with your phone's camera (iPhone) or the Expo Go app (Android).

No API key yet? Put `SCAN_DEMO=1` in `.env.local` instead. Scanning then returns a sample meal,
so you can try the whole flow for free.

If your phone can't connect (school or office Wi-Fi often blocks it), try `npx expo start --tunnel`.

### Useful commands

```bash
npm run typecheck     # TypeScript
npm test              # smoke tests that render every screen
npx expo lint         # lint
```

## Beta switches

`src/config.ts` has two switches. Both are `false` for the beta:

- `AI_FEATURES`: meal photo scanning and body check. Off means no server or API key is needed.
- `PAYWALL`: Pro plans and free-scan limits. Off means no prices or limits anywhere.

Change them to `true` when you're ready, then rebuild.

## Build an APK to share

```bash
git add -A
git commit -m "your note"
eas build -p android --profile preview
```

Download the .apk from the build page and keep a copy (for example in Google Drive),
because Expo's download link doesn't last forever.

## How the numbers work

- **Calories:** Mifflin-St Jeor BMR × activity level, then a deficit (cut) or surplus (bulk).
- **BMI changes the plan:** underweight users can't cut (held at maintenance), fast cuts need BMI 25+,
  overweight and obese users get a lean surplus when bulking, and protein is based on the top of the
  healthy range when BMI is in the obese range.
- **Floors:** a cut never goes below 1,500 kcal (men) or 1,200 kcal (women).
- **Asia-Pacific BMI cutoffs** are available in the Body screen.
- Food values are approximate. Scanned portions are estimates, so users can edit grams before adding.

## Turning it into a real, paid app

Expo Go is for testing. To publish, you'll move to a **development build** and then a store build.

### 1. Accounts you'll need

- Expo account (free): `npx eas-cli@latest login`
- Apple Developer Program ($99/year) for the App Store
- Google Play Console ($25 one time) for Google Play
- RevenueCat (free to start) for subscriptions
- Anthropic API key with billing set up

### 2. Real subscriptions with RevenueCat

1. Create your subscription products in App Store Connect and Google Play Console
   (for example `pro_monthly` and `pro_yearly`), and an entitlement called `pro` in RevenueCat.
2. `npx expo install react-native-purchases`
3. Configure RevenueCat once at startup (in `src/app/_layout.tsx`) with your public SDK keys.
4. In `src/lib/subscription.ts`, set `IS_TEST_STORE = false` and replace `purchasePlan()` and
   `restorePurchases()` with the RevenueCat calls shown in the comments there.
5. Read the real, localized prices from RevenueCat instead of the placeholder `PLANS` prices.

`react-native-purchases` includes native code, so from here on test with a development build:

```bash
npx eas-cli@latest build --profile development --platform android   # or ios
```

### 3. Put the scan server online

While you develop, the scan server runs on your computer. For store builds it needs to live online:

```bash
npx expo export --platform web
npx eas-cli@latest deploy --prod
```

Add `ANTHROPIC_API_KEY` as a secret in your EAS Hosting environment, then set the deployed URL as
`origin` for the `expo-router` plugin in `app.json` (see the Expo docs on API routes).

**Before launch, protect the scan server.** Right now anyone who finds the URL could use your key.
Add user sign-in (Supabase, Firebase or Clerk all work with Expo), check the user's subscription on
the server before calling the AI (RevenueCat has a REST API for this), and enforce the free-scan limit
there, not only on the phone.

### 4. Build and submit

```bash
npx eas-cli@latest build --platform all
npx eas-cli@latest submit --platform all
```

You'll also need an app icon, screenshots, a privacy policy URL, and to fill in the stores'
data-safety and health-app questions. Photo uploads count as user data, so say so in your privacy policy.

## Project map

```
src/
  app/
    _layout.tsx          fonts, theme, navigation stack
    (tabs)/_layout.tsx   bottom tabs
    (tabs)/index.tsx     Today
    (tabs)/plan.tsx      Meal plan
    (tabs)/body.tsx      Body & BMI
    add.tsx              search and add food
    scan.tsx             photo scanner
    paywall.tsx          Pro plans
    api/scan+api.ts      scan server (runs on the server, holds the API key)
  lib/
    foods.ts             food database and meal templates
    nutrition.ts         BMI, calorie and macro targets
    plan.ts              meal plan builder
    store.ts             app state saved on the device
    subscription.ts      test store (swap for RevenueCat)
    scan-client.ts       photo resize + call to the scan server
  components/            UI pieces and the Nutrition Facts label
  theme.ts               colors (light and dark) and fonts
```

This app gives general nutrition estimates and is not medical advice.
