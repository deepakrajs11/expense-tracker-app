"use client";

import React from "react";

export default function SDKPage() {
  const isAndroid =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900">
        Android SMS SDK
      </h1>

      {/* Brief description */}
      <p className="text-gray-700">
        This SDK is an installable Android app that listens for SMS notifications
        and helps curate bank message mappings.
      </p>

      {/* Device compatibility */}
      <section className="mt-4">
        <h3 className="text-xl font-semibold text-gray-800">
          Device compatibility
        </h3>
        <p className="mt-2 text-gray-600">
          {isAndroid
            ? "Android device detected – you can download the APK directly."
            : "Not an Android device – download the APK on an Android device to install."}
        </p>
      </section>

      {/* Download button */}
      <a href="/api/sdk/download">
        <button className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
          Download SDK (APK)
        </button>
      </a>

      {/* Installation steps */}
      <section className="mt-6">
        <h3 className="text-xl font-semibold text-gray-800">
          Install &amp; setup
        </h3>
        <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-600">
          <li>Download the APK on your Android phone.</li>
          <li>
            Allow installation from unknown sources (if required) and install the
            app.
          </li>
          <li>Open the SDK app and grant SMS permissions.</li>
          <li>
            The SDK will prompt you to map message formats the first time it
            encounters a new sender. Mappings are saved locally for future
            auto‑parsing.
          </li>
        </ol>
      </section>

      {/* Developer notes */}
      <section className="mt-6">
        <h3 className="text-xl font-semibold text-gray-800">
          Notes for developers
        </h3>
        <p className="mt-2 text-gray-600">
          The SDK source lives in <strong>android-sdk/</strong>. Build it locally
          with:
        </p>
        <pre className="mt-2 bg-gray-100 p-3 rounded text-sm overflow-x-auto">
          ./android-sdk/gradlew assembleDebug
        </pre>
      </section>
    </div>
  );
}