# Testing Guide for Android SMS SDK & Expense Tracker Integration

This guide covers testing all current implementations: Next.js API endpoints, dashboard page, and Android SDK.

## Prerequisites

- Node.js 18+ and npm
- Java JDK 11+ (for Android SDK)
- Android SDK and Android Studio (for building/testing SDK)
- `curl` or Postman for API testing
- Docker + Docker Compose (for local database)

## Part 1: Setup the Next.js App

### 1.1 Install dependencies

```bash
cd "/home/deepakrajs/Personal Dev/expense-tracker-app"
npm install
```

### 1.2 Optionally install archiver for ZIP downloads

```bash
npm install archiver stream-buffers
```

### 1.3 Start the database (Docker)

```bash
docker-compose up -d
```

Wait for the database to be ready (check logs with `docker-compose logs -f`).

### 1.4 Run migrations

```bash
npm run db:migrate
```

### 1.5 Start Next.js dev server

```bash
npm run dev
```

You should see:
```
> next dev

  ▲ Next.js 16.2.3
  - Local:        http://localhost:3000
```

## Part 2: Test API Endpoints

### 2.1 Test `/api/sdk/accounts` (without token)

Should fail with 401 if `SDK_SYNC_TOKEN` is set. First test without token:

```bash
curl http://localhost:3000/api/sdk/accounts
```

Expected output (no token check by default):
```json
["Checking Account", "Savings Account", "Credit Card", "Cash Wallet"]
```

### 2.2 Test `/api/sdk/accounts` with token security enabled

Set the environment variable in your `.env` or terminal:

```bash
export SDK_SYNC_TOKEN="my-secret-token-123"
```

Restart the dev server (Ctrl+C, then `npm run dev`).

Test without token (should fail):
```bash
curl http://localhost:3000/api/sdk/accounts
```

Expected: `{"error":"Unauthorized"}` with status 401

Test with token in header:
```bash
curl -H "x-sdk-token: my-secret-token-123" http://localhost:3000/api/sdk/accounts
```

Expected: accounts array with status 200

Test with token in query param:
```bash
curl "http://localhost:3000/api/sdk/accounts?token=my-secret-token-123"
```

Expected: accounts array with status 200

### 2.3 Test `/api/sdk/download` (APK/ZIP endpoint)

Download the source ZIP (streams `android-sdk/` directory):

```bash
curl -o sdk-source.zip http://localhost:3000/api/sdk/download
unzip -l sdk-source.zip | head -20
```

Expected: should create `sdk-source.zip` with `android-sdk/` directory structure.

Once the SDK APK is built, it will serve `app-debug.apk` instead. Verify the APK file:

```bash
file sdk-source.zip
```

## Part 3: Test Dashboard Page

### 3.1 Visit the SDK page (Public, No Login Required)

Open a browser and navigate to:

```
http://localhost:3000/app/sdk
```

You should see:
- Title: "📱 Android SMS SDK"
- Device detection (will show "✅ Android device detected" or "⚠️ Not an Android device...")
- A "📥 Download SDK (APK or Source)" button
- Installation steps
- Features list
- Developer notes

### 3.2 Test the download button

Click the "Download SDK (APK)" button. This should:
- Trigger a download of either `app-debug.apk` (if built) or `android-sdk.zip` (source)
- Check browser downloads folder for the file

### 3.3 Test on Android device/emulator

Using an Android phone or emulator browser:
1. Navigate to `http://<your-machine-ip>:3000/app/sdk` from the phone, not `localhost`.
   - On a real phone, `localhost` refers to the phone itself. Use your PC's LAN IP, e.g. `http://192.168.1.100:3000/app/sdk`.
2. Device detection should show "✅ Android device detected"
3. Click "📥 Download SDK (APK or Source)"
4. Install and test the SDK app

> If the browser downloads a ZIP file instead of an APK, the APK build is missing or not yet generated. Run `cd android-sdk && ./gradlew assembleDebug` on your machine first.

## Part 4: Build & Test Android SDK

### 4.1 Generate a release keystore (first time only)

```bash
cd android-sdk
keytool -genkey -v -keystore app/keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias smssdk
```

Answer the prompts (you can use dummy data for testing). This creates `app/keystore.jks`.

### 4.2 Build debug APK

```bash
cd android-sdk
./gradlew assembleDebug
```

Output: `android-sdk/app/build/outputs/apk/debug/app-debug.apk`

### 4.3 Build release APK

```bash
cd android-sdk
./gradlew assembleRelease
```

Output: `android-sdk/app/build/outputs/apk/release/app-release.apk`

Note: You'll need to configure signing in `app/build.gradle` for release builds. See [Android signing documentation](https://developer.android.com/studio/publish/app-signing).

### 4.4 Test APK on emulator or device

Using Android Studio or ADB:

```bash
adb install android-sdk/app/build/outputs/apk/debug/app-debug.apk
```

Once installed:
1. Open the SDK app
2. Grant SMS permissions when prompted
3. Send a test SMS to the device (use Android Studio's emulator SMS simulator or send a real SMS)
4. The app should:
   - Receive the SMS
   - Parse it for amount/type
   - If it's the first time seeing that sender, show a notification
   - Notification should have "Map now" and "Add category" actions
5. Tap "Map now" to open the mapping UI
6. In mapping UI:
   - "Sync accounts from host" button should fetch the list from `/api/sdk/accounts`
   - Select an account to map the sender to
   - Mapping should be saved locally

### 4.5 Test SMS parsing & notifications

Send a test SMS with a clear debit/credit message:

Examples (these vary by bank):
```
"AXIS Bank: Rs 500 debited. Bal: Rs 1500. Card: ****1234. Time: 10:30"
"SBI: Your account XXXXXX has been credited with Rs 1000 on 01-Jun-2026"
```

The SDK should:
1. Parse the amount (500, 1000)
2. Detect type (debit/credit)
3. Show a notification
4. Allow mapping and category assignment

### 4.6 Test scanner feature (optional)

In the mapping UI, tap "Scan / Enter code":
- **If external scanner is available:** It will launch ZXing or similar
- **Manual entry:** Enter a test code and submit

### 4.7 Test account synchronization

Configure the host API in the SDK settings:

Add to `.env`:
```
SDK_SYNC_TOKEN=my-secret-token-123
```

In the mapping UI, tap "Sync accounts from host". The SDK should:
1. Call `http://<host>:3000/api/sdk/accounts` with the token
2. Display the fetched accounts
3. Allow selection

## Part 5: Integration Testing

### 5.1 End-to-end flow

1. **App running:** `npm run dev` on port 3000
2. **Database running:** `docker-compose up -d`
3. **SDK built:** `cd android-sdk && ./gradlew assembleDebug`
4. **SDK installed:** `adb install android-sdk/app/build/outputs/apk/debug/app-debug.apk`
5. **Test flow:**
   - Open SDK page at `http://localhost:3000/app/sdk`
   - Click "Download SDK (APK or Source)"
   - Install APK on device
   - Receive SMS
   - Map sender to account
   - Verify notification + category prompt
   - Check that parsed transaction is broadcast

### 5.2 CI/CD Testing

The GitHub Actions workflow (`.github/workflows/build_sdk.yml`) builds the SDK APK automatically:

To test locally, you can simulate:
```bash
cd android-sdk
./gradlew clean assembleRelease
```

Once pushed to GitHub, the workflow will:
1. Build the release APK
2. Upload artifact to GitHub Actions
3. Make it available for download

## Part 6: API Response Examples

### GET /api/sdk/accounts (with token)

Request:
```bash
curl -H "x-sdk-token: my-secret-token-123" http://localhost:3000/api/sdk/accounts
```

Response:
```json
["Checking Account", "Savings Account", "Credit Card", "Cash Wallet"]
```

### GET /api/sdk/download

Request:
```bash
curl http://localhost:3000/api/sdk/download -o download.zip
```

Response: Binary ZIP file (or APK if built)

## Troubleshooting

### Issue: `npm install` fails
- Ensure Node.js 18+ is installed: `node -v`
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, retry

### Issue: Database connection fails
- Ensure Docker is running: `docker ps`
- Check logs: `docker-compose logs db`
- Verify credentials in `.env` match docker-compose.yml

### Issue: SDK won't build
- Ensure Java JDK 11+ is installed: `java -version`
- Ensure Android SDK is installed
- Check `android-sdk/build.gradle` has correct SDK versions
- Run `./gradlew clean` before retrying

### Issue: APK won't install ("app not installed")
- Check your phone's Android version: **Settings > About > Android version** (needs Android 5.0+, API 21+)
- Ensure "Unknown Sources" is enabled: **Settings > Security > Unknown Sources** (or **Apps & Notifications > Advanced > Install Unknown Apps**)
- Clear Google Play Store cache: **Settings > Apps > Google Play Store > Storage > Clear Cache**
- Free up storage: ensure at least 100 MB is available on the device
- Try using ADB to install with detailed errors:
  ```bash
  adb devices  # List connected devices/emulators
  adb install -r android-sdk/app/build/outputs/apk/debug/app-debug.apk
  ```
- If ADB install fails, check the error and retry with `-g` flag (grant permissions):
  ```bash
  adb install -rg android-sdk/app/build/outputs/apk/debug/app-debug.apk
  ```
- Verify APK integrity on PC:
  ```bash
  cd android-sdk
  file app/build/outputs/apk/debug/app-debug.apk  # Should say "Android package"
  unzip -t app/build/outputs/apk/debug/app-debug.apk  # Should pass all tests
  ```
- If all else fails, uninstall and retry:
  ```bash
  adb uninstall com.example.smssdk
  adb install android-sdk/app/build/outputs/apk/debug/app-debug.apk
  ```

### Issue: APK won't install on emulator
- Ensure emulator is running: `adb devices`
- Check API level compatibility: `adb shell getprop ro.build.version.sdk`
- Use: `adb install -r android-sdk/app/build/outputs/apk/debug/app-debug.apk` to overwrite

### Issue: SMS receiver not triggering
- Verify SMS permissions are granted in app settings
- Ensure the app is running (not just installed)
- Check logcat: `adb logcat | grep SmsReceiver`
- Send SMS from emulator: `telnet localhost 5554` -> `sms send <phone> <message>`

## Next Steps

After testing, consider:
- [ ] Add integration tests for API endpoints (Jest + Supertest)
- [ ] Add end-to-end tests for SDK (Espresso)
- [ ] Integrate with user authentication system
- [ ] Set up automated APK signing and GitHub Releases
- [ ] Deploy to production infrastructure
