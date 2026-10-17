# Florin

A mobile banking app: everyday and savings accounts, transfers to any Philippine bank or e-wallet,
bill payments, cards you can freeze, savings goals, budgets and spending insights. Built with Expo
(SDK 58) and Expo Router.

**It's a demo.** The money, people and payments are made up and saved only on your phone. Nothing
connects to a real bank and no money moves. Every new account starts with five months of realistic
history so there's something to look at.

## What's inside

| Screen | What it does |
| --- | --- |
| **Welcome** | What the demo is, your name, a 6-digit PIN (typed twice), then optional Face ID or fingerprint |
| **Lock screen** | Opens with your PIN or face/fingerprint. Locks again after the app has been in the background for a while (you choose how long), and a cover hides your balance in the app switcher |
| **Home** | Total balance (tap the eye to hide it), money in and out this month, Send / Pay bills / Add money / Move, accounts, savings goals, recent activity |
| **Pay** | Send, pay bills, receive, move money, your people and saved billers (long-press to remove), today's transfer limit |
| **Cards** | A debit card and an online-only virtual card. Freeze, show the number and CVV (asks for your PIN, hides again after 30 seconds), switch online, contactless, ATM and overseas use on or off, set a daily limit, replace a lost card, and try a test payment to see what gets declined |
| **Insights** | Any month: spending so far against last month, spending by category with budgets, money in and out for the last six months, and where you spent most |
| **Send money** | Pick someone (or add anyone with a bank or e-wallet account), type the amount, choose InstaPay (arrives in seconds, up to ₱50,000) or PESONet (next banking day), review, confirm with your PIN, share the receipt |
| **Pay a bill** | 16 billers including Meralco, Maynilad, PLDT, Globe, credit cards, SSS, PhilHealth and Pag-IBIG. Save a biller to pay it in two taps next time |
| **Move money** | Between your own accounts and goals. Instant, free, and no PIN needed |
| **Activity** | Everything by day, with search, filters and per-account views |
| **Payment details** | Status, reference number, category (change it), a note for yourself, share receipt |
| **Accounts and goals** | Account number (hidden until you tap), interest earned, history. Goals have a progress ring, add or withdraw, edit and close |
| **Profile** | Face or fingerprint unlock, change PIN, lock timing, hide balances, demo tools, reset |

## Run it in Expo Go

You need Node.js 22 or newer on your computer and the **Expo Go** app on your phone (App Store or
Google Play). Your phone and computer must be on the same Wi-Fi.

```bash
cd bank
npm install
npx expo start
```

Scan the QR code with your phone's camera (iPhone) or the Expo Go app (Android). If your phone can't
connect (school or office Wi-Fi often blocks it), try `npx expo start --tunnel`.

Florin uses Expo SDK 58, the version the Expo Go app in the stores runs now.

To try it on your computer instead, press `w` after `npx expo start` to open it in a web browser.

### Useful commands

```bash
npm run typecheck     # TypeScript
npm test              # money rules, plus the main screens and flows
npx expo lint         # lint
```

## How the money works

- **Amounts are whole centavos**, never decimals, so ₱0.10 + ₱0.20 is always ₱0.30.
- **Balances aren't stored.** They're added up from the opening balance and every payment, so they
  can't drift out of step with the history.
- **Moving money creates two entries** with the same reference, one out and one in.
- **Pending money:** card payments show as pending for about two days until the shop collects them,
  and PESONet transfers land the next banking day at 10 AM. Both leave your available balance
  straight away.
- **Limits:** InstaPay up to ₱50,000 per transfer, ₱200,000 a day across transfers and bills (moves
  between your own accounts don't count), and each card's own daily limit.
- **Savings** earn 3.25% a year, paid monthly.

Change the bank name, currency, limits and rates in `src/config.ts`, and the banks, billers and
spending categories in `src/lib/catalog.ts`.

## Security

- **The PIN is never saved.** A random salt and the SHA-256 hash of the PIN go into the phone's
  secure storage (Keychain on iPhone, Keystore on Android), and a typed PIN is checked against it.
- **Wrong PINs:** after 5 wrong tries the app makes you wait 30 seconds. Each wrong PIN after that
  doubles the wait, up to 15 minutes. Closing the app doesn't reset this.
- **Sending money and paying bills** always ask for your PIN (or face/fingerprint).
- **Face ID** doesn't work in Expo Go on iPhone, because Expo Go can't carry Florin's Face ID
  permission. Fingerprint works in Expo Go on Android. A development or EAS build supports both.
- **Forgot your PIN?** The lock screen offers to reset the app, which wipes everything and starts
  over with new demo money.

## Build an APK to share

```bash
cd bank
npx eas-cli@latest build -p android --profile preview
```

The first build creates Florin's own EAS project (separate from Forkcast's, so it installs as a
separate app) and asks to generate an Android signing key. Say yes. Download the .apk from the
build page and keep a copy, because Expo's download link doesn't last forever.

Before publishing anything, change `com.yourname.florin` in `app.json` to your own reverse domain.

## Turning it into a real bank app

A real app can't keep the money on the phone. You'd need:

1. **A licensed partner.** In the Philippines that means a bank, or a banking-as-a-service provider,
   regulated by the BSP. They hold the money and connect you to InstaPay, PESONet and the billers.
2. **A server** that holds the ledger and does every check in `src/lib/ledger.ts` (funds, limits,
   card controls). The app's checks are only there to give quick feedback.
3. **Real sign-in:** identity verification (KYC) when the account is opened, server sessions, device
   binding, and one-time passwords for new devices and new recipients.
4. **Security reviews**, fraud monitoring, and the stores' finance-app requirements.

The screens can stay. Swap the actions in `src/lib/store.ts` for calls to your server.

## Project map

```
src/
  app/
    _layout.tsx            navigation, theme, lock screen and privacy cover
    welcome.tsx            first run: name, PIN, face or fingerprint
    (tabs)/(home)/         Home
    (tabs)/pay/            Pay
    (tabs)/cards/          Cards
    (tabs)/insights/       Insights
    send.tsx               send money: who, how much, review, PIN, receipt
    bill.tsx               pay a bill
    move.tsx               move between your accounts and goals
    add-money.tsx          your account details, and the demo top-up
    activity.tsx           all payments, search and filters
    transaction/[id].tsx   payment details
    account/[id].tsx       one account
    goal/[id].tsx          one savings goal (goal-edit.tsx creates and edits them)
    budgets.tsx            monthly budgets by category
    recipient.tsx          add a person
    profile.tsx            security, privacy and demo settings
    change-pin.tsx         change PIN
  lib/
    ledger.ts              the money rules: balances, transfers, bills, cards, goals, limits
    store.ts               app state saved on the phone, and the actions screens call
    seed.ts                the demo history every new account starts with
    security.ts            PIN hashing, wrong-PIN lockout, face and fingerprint
    session.ts             locking after time in the background
    catalog.ts             banks, e-wallets, billers and categories
    money.ts, dates.ts     formatting
    receipt.ts             receipts to share
  components/              keypad and PIN pad, charts, cards, lock screen and other UI pieces
  config.ts                bank name, currency, limits and rates
  theme.ts                 colours (light and dark) and spacing
__tests__/                 tests for the money rules and the main flows
```
