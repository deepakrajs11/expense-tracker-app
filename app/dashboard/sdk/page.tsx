"use client"

import React from 'react'

export default function SDKPage() {
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

  return (
    <div style={{ padding: 20 }}>
      <h1>Android SMS SDK</h1>
      <p>This SDK is an installable Android app that listens for SMS notifications and helps curate bank message mappings.</p>

      <h3>Device compatibility</h3>
      <p>{isAndroid ? 'Android device detected' : 'Not an Android device (download on an Android device to install APK).'}</p>

      <a href="/api/sdk/download">
        <button style={{ padding: '8px 16px', marginTop: 12 }}>Download SDK (APK)</button>
      </a>

      <h3>Install & setup</h3>
      <ol>
        <li>Download the APK on your Android phone.</li>
        <li>Allow install from unknown sources if required and install the app.</li>
        <li>Open the SDK app and grant SMS permissions.</li>
        <li>The SDK will prompt you to map message formats the first time it encounters a new sender.
        Mappings are saved locally for future auto-parsing.</li>
      </ol>

      <h3>Notes for developers</h3>
      <p>The SDK source is in the repository at <strong>android-sdk/</strong>. Build it locally with:</p>
      <pre>./android-sdk/gradlew assembleDebug</pre>
    </div>
  )
}
