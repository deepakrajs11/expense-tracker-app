"use client"

import React from 'react'

export default function SDKPage() {
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h1>📱 Android SMS SDK</h1>
      <p>This SDK is an installable Android app that listens for SMS notifications and helps curate bank message mappings.</p>

      <h2>Device Compatibility</h2>
      <p>{isAndroid ? '✅ Android device detected' : '⚠️ Not an Android device. Please download on an Android phone to install.'}</p>

      <a href="/api/sdk/download" style={{ textDecoration: 'none' }}>
        <button style={{ 
          padding: '12px 24px', 
          marginTop: 12, 
          fontSize: 16,
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer'
        }}>
          📥 Download SDK (APK or Source)
        </button>
      </a>

      <h2>Installation Steps</h2>
      <ol>
        <li>Download the APK on your Android phone.</li>
        <li>Allow install from unknown sources if required and install the app.</li>
        <li>Open the SDK app and grant SMS permissions.</li>
        <li>The SDK will prompt you to map message formats the first time it encounters a new sender. Mappings are saved locally for future auto-parsing.</li>
        <li>When a new SMS arrives, the app will notify you and ask to confirm the transaction and category.</li>
      </ol>

      <h2>Features</h2>
      <ul>
        <li>✅ SMS interception & parsing</li>
        <li>✅ Automatic debit/credit detection</li>
        <li>✅ Account mapping & syncing</li>
        <li>✅ Notification prompts for new senders</li>
        <li>✅ Category assignment</li>
        <li>✅ QR/barcode scanner for account linking</li>
      </ul>

      <h2>For Developers</h2>
      <p>The SDK source is in the repository at <strong>android-sdk/</strong>. Build it locally with:</p>
      <pre style={{ backgroundColor: '#f5f5f5', padding: 10, borderRadius: 4 }}>cd android-sdk
./gradlew assembleDebug</pre>

      <h2>API Endpoints</h2>
      <ul>
        <li><code>GET /api/sdk/accounts</code> — Fetch accounts for mapping (requires token if configured)</li>
        <li><code>GET /api/sdk/download</code> — Download APK or SDK source</li>
      </ul>

      <hr style={{ marginTop: 40, marginBottom: 20 }} />
      <footer style={{ fontSize: 12, color: '#666' }}>
        <p>SDK Implementation • Production Ready • {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
