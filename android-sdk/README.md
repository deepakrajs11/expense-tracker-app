# Expense Tracker – Android App

Native Android companion to the Expense Tracker web application. Calls the same REST APIs and keeps data in sync with the web account.

## Features

- Login / Register (same credentials as the web app)
- Dashboard with net balance, total income, total expenses
- Expenses list + add expense (amount, category, description, source, date)
- Incomes list + add income (amount, place, source, date)
- Profile screen with logout

## Build

Requirements: Java 17, Android SDK (API 21+).

```bash
# Build with default URL (from gradle.properties)
./gradlew assembleDebug

# Build pointing to a specific deployment
./gradlew assembleDebug -PWEB_BASE_URL=https://your-deployment.com
```

APK output: `app/build/outputs/apk/debug/app-debug.apk`

The CI pipeline (`/.github/workflows/build-apk.yml`) builds the APK automatically on every push to `main` and commits it to `public/downloads/app-debug.apk` so the web app can serve it immediately.

## Configuring the API URL

The base URL is injected at build time via `BuildConfig.BASE_URL`.  
Priority: gradle project property `-PWEB_BASE_URL` → `WEB_BASE_URL` environment variable → default in `gradle.properties`.
