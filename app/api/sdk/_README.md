SDK support endpoints

- `GET /api/sdk/accounts` — returns a JSON array of account names for the SDK to sync with.
- `GET /api/sdk/download` — serves the built APK if present, otherwise creates a ZIP of `android-sdk/` and returns it.

In production you should secure `/api/sdk/accounts` (authenticate) and ensure large zips are streamed efficiently.

Security notes:

- Set an environment variable `SDK_SYNC_TOKEN` to a shared secret. The SDK should call `/api/sdk/accounts` with header `x-sdk-token: <token>` or `?token=<token>` to authenticate.
- Consider further hardening: per-user tokens, request signing, and HTTPS-only access.
