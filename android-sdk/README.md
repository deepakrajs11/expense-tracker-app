Android SMS SDK (sample app)

This directory contains a minimal Android app project that acts as an installable SDK app. It listens for incoming SMS messages, attempts to parse debit/credit notifications, and provides a simple mapping UI for first-time message curation.

How to build

1. Install Android SDK & Java JDK 11+
2. From this folder run `./gradlew assembleDebug` to build an APK at `app/build/outputs/apk/debug/app-debug.apk`.

Permissions & setup

- The app requests `RECEIVE_SMS` and `READ_SMS` permissions. On Android 6+ you must request them at runtime.
- To enable automatic receipt of messages, the user must grant SMS permissions and set this app as the default SMS app on newer Android versions when required by the platform.

Runtime behavior

- The SDK registers a `BroadcastReceiver` to receive SMS messages.
- On first time encountering a bank message pattern, it opens a small mapping UI to let the user confirm which part of the message corresponds to debit/credit amounts, account, and narration.
- Mappings are stored locally in `SharedPreferences` for subsequent automatic parsing.

Additional features:

- Notification prompts: when an SMS is parsed, the SDK shows a notification that allows the user to "Map now" or "Add category". Mapping opens the SDK mapping UI.
- Mapping UI: lets the user sync accounts from a host API, add accounts manually, choose an account to map a sender to, or scan/enter a temporary code to link to an account.
- Scanner: the SDK attempts to launch an external scanner app (ZXing) if available; otherwise a manual code entry is provided.

Developer note: The SDK broadcasts an intent `com.example.smssdk.TRANSACTION_PARSED` with parsed details (`from`, `body`, `amount`, `type`) — your host app on Android can listen for this to receive parsed transactions.

Integrating with your app

- This sample is provided as an installable APK. You can adapt it into a library (`aar`) if you want tighter integration.
- Alternatively, the app can expose parsed transactions via a deep link or by broadcasting an intent that the host app listens for.

Notes

This is an initial scaffold. You will need to adjust the parsing rules and mapping UI for your specific banks and message formats.
