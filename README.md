# SUS Among-US

A React Native / Expo app for community-driven suspicious-activity reporting across Mumbai-area railway stations. Users can sign in, browse recent sightings, submit reports with optional photo evidence, vote on reports, find the nearest station, chat with the crew, and send bugs/feature ideas to Mission Control.


## 📱 Download

### Android

[![Click here to Download APK](https://img.shields.io/badge/Download-APK-green?style=for-the-badge&logo=android)](https://github.com/FullStackFailures/SUS-AMONG-US/releases/latest)

Download and install the latest Android APK directly from GitHub.

> Android may ask you to allow installation from this source when installing an APK downloaded outside Google Play.


## Features

- Email/password authentication + OTP/recovery
- 30-minute anonymous visitor mode
- Live sightings feed with search, filters, sorting, and voting
- Report sightings with station, status, notes, camera/gallery evidence
- 152 predefined stations with nearest-station GPS lookup
- Real-time Crew Chat via Supabase Realtime
- Bug reports and feature suggestions
- Admin Control Room
- Light/dark theme with local persistence
- Supabase Storage for report photos

## Stack

- Expo SDK 54
- React Native 0.81
- TypeScript 5.9
- Supabase (`auth`, Postgres, Storage, Realtime)
- Expo Location / Image Picker
- AsyncStorage

## Requirements

- Node.js 20.19+ recommended
- npm
- Expo account for EAS cloud builds
- Supabase project
- Android Studio + Android SDK for local Android builds
- Expo Go for physical-device development

## 1. Install

```bash
git clone https://github.com/FullStackFailures/Sus-Among-Us.git
cd SUS-AMONG-US
npm install
```

Run the project from the directory containing `package.json`.

## 2. Environment Variables

Create `.env` in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY

EXPO_PUBLIC_ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD. "The apps control room feature password, run the app and go to hamburger icon --> control room" you will get to know what is this password about

EXPO_PUBLIC_REPORT_IMAGES_BUCKET=report-images
CLEANUP_SECRET=YOUR_CLEANUP_SECRET
```


`CLEANUP_SECRET` is currently not required by the React Native client code, but may be kept for related deployment tooling.

> **Important:** Never commit `.env` or real secrets. Expo `EXPO_PUBLIC_*` variables are bundled into the client, so `EXPO_PUBLIC_ADMIN_PASSWORD` is **not a secure server-side admin secret**. Move admin authentication to a server-side/Supabase-controlled authorization system before treating the Control Room as secure.

The supplied project contains an older `REPORT_IMAGES_BUCKET` variable name in `.env`, while the code reads `EXPO_PUBLIC_REPORT_IMAGES_BUCKET`. Use the `EXPO_PUBLIC_` name above.

#### YOU CAN ALSO CHECK THE example.env IN THE REPO

## 3. Supabase Setup

The repository does not include SQL migrations. Your Supabase project must provide the objects expected by the app:

### Auth
Enable:
- Email/password authentication
- Anonymous sign-ins
- OTP/recovery flow as configured for the project

### Database tables
The app reads/writes:

- `stations`
- `tc_updates`
- `track_talk_messages`
- `bug_reports`
- `change_requests`

### RPC
The app calls:

```text
handle_vote_v2
```

with:

```text
target_update_id
target_user_id
new_vote_type
```

### Storage
Create the bucket used by `EXPO_PUBLIC_REPORT_IMAGES_BUCKET` (default: `report-images`) and configure its policies appropriately.

### Realtime
Enable Realtime for:

```text
track_talk_messages
```

Use Row Level Security and policies that match your intended access model. Do not make write/delete access public just to make the app work.

## 4. Run with Expo Go

```bash
npm start
```

or:

```bash
npx expo start
```

Then open Expo Go on the Android/iOS device and scan the QR code.

For a local Android emulator:

```bash
npm run android
```

Web:

```bash
npm run web
```

iOS:

```bash
npm run ios
```

`npm run ios` requires macOS/Xcode.

## 5. Build an APK with EAS. If you are not able to understand this, ask chatgpt or claude for a setup and run guide

Install/login to EAS App from playstore/appstore. create account and login with the below command from vscode terminal

```bash
npm install -g eas-cli
eas login
```

Preview APK:

```bash
eas build --platform android --profile preview
```
APK will be created in the EAS APP

Production Android App Bundle:

```bash
eas build --platform android --profile production
```

The repository's `eas.json` is configured for:
- `preview` → APK
- `production` → AAB

Before publishing, remove/rotate any credentials stored directly inside `eas.json` and replace them with EAS environment variables or another secure secret-management approach.

## 6. Local Android Build

Generate the native Android project:

```bash
npx expo prebuild
```

Then:

```bash
npx expo run:android
```

For a release APK from the generated `android` directory on Windows:

```powershell
cd android
.\gradlew.bat assembleRelease
```

## Project Structure

```text
SUS-AMONG-US/
├─ App.tsx
├─ index.ts
├─ app.json
├─ eas.json
├─ package.json
├─ lib/
│  ├─ supabase.ts
│  ├─ stations.ts
│  └─ scaling.ts
├─ src/
│  ├─ hooks/
│  ├─ screens/
│  ├─ data/
│  ├─ theme.ts
│  ├─ styles.ts
│  ├─ types.ts
│  └─ utils.ts
└─ assets/
```

## Notes

- Sightings are loaded from the last **10 hours**.
- Visitor mode lasts **30 minutes**.
- Crew Chat is unavailable in visitor mode.
- Photo evidence is uploaded to Supabase Storage before the sighting row is created.
- The app expects the database schema/RLS policies to already exist; this repository does not ship database migrations.

## License / Responsibility

This project is released under the MIT License. See [`LICENSE`](./LICENSE).

You are responsible for how you modify, deploy, and use this software, including any content submitted, stored, displayed, or distributed through your own deployment. The original repository owner is not responsible for illegal, abusive, unauthorized, or otherwise inappropriate use by independent users or modified deployments.
