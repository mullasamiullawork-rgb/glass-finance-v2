# Glass Finance v2

Offline-first Liquid Glass personal finance Android app (and web PWA) with automatic on-device UPI & bank SMS tracking, budgeting, analytics, goals, bills, and an offline financial assistant.

## Overview

- **Offline-first & Local Storage:** All financial data (accounts, transactions in paise, budgets, goals, bills, settings) is stored locally on-device with JSON backup, CSV export, and PDF summary export.
- **Automatic UPI & SMS Tracking (Android):** Parses notifications from Paytm, Google Pay, PhonePe, BHIM, Amazon Pay, and Bank SMS alerts on-device without uploading data to external servers.
- **Security:** Optional 4-digit PIN lock and Android biometric authentication.
- **Liquid Glass UI:** Responsive, theme-aware (`system`, `light`, `dark`) interface with Quick Add / Edit transaction sheets, balance privacy toggle, and offline assistant.

## Architecture

- `web/src/core.js` — Core utilities, INR/paise formatting, date helpers, local store, financial calculations, search, and offline assistant logic.
- `web/src/native.js` — Capacitor native bridge (`AutoTrack` plugin) for Android notification access, listener rebind, biometric unlock, and PDF summary export.
- `web/src/ui.js` — DOM rendering, Liquid Glass views (`home`, `tx`, `search`, `budget`, `analytics`, `goals`, `bills`, `assistant`, `auto`, `accounts`, `settings`), Quick Add/Edit sheets, and lock screen.
- `web/src/app.js` — Application bootstrap, hash routing, and event wiring.
- `scripts/build-web.mjs` — Bundles web assets into the output directory for Capacitor.
- `capacitor.config.json` — Capacitor 8 configuration for the Android wrapper.
- `tests/web/` — Automated Node.js test suite (`app.test.mjs`).

## RBI Account Aggregator (Sahamati) Note

Direct bank-grade Account Aggregator (AA) integration in India requires registration as a Financial Information User (FIU) under the RBI Account Aggregator ecosystem. For official details on becoming an FIU, see Sahamati's guide:
- https://sahamati.org.in/financial-information-user-fiu/

Because Glass Finance v2 is an offline-first personal app without a regulated FIU backend, it uses on-device Android notification/SMS parsing rather than RBI AA APIs.

## Android 15 Install Instructions

1. **Install the APK:** Download or transfer the built Android APK to your Android 15 device and tap to install (allow **Install unknown apps** for your file manager/browser if prompted).
2. **Allow Restricted Settings (Android 15 sideloaded APKs):**
   - If Android 15 blocks Notification Access with *"Restricted setting"*, open **Settings → Apps → See all apps → Glass Finance**.
   - Tap the **⋮** (three-dot menu) in the top-right corner and select **Allow restricted settings**, then authenticate with your PIN/biometric.
3. **Enable Notification Access:**
   - Open Glass Finance → **Automatic Tracking (`#/auto`)** → tap **Notification Access** (or go to **Settings → Notifications → Notification access**) and enable **Glass Finance**.
   - Use **Reconnect Listener** in the app if notifications are not detected immediately after a reboot.

## Development & Testing Commands

```bash
# Install dependencies
npm install

# Run unit tests (Node built-in test runner)
npm test

# Build web assets
npm run build

# Sync web build to Android Capacitor project
npm run cap:sync
```
