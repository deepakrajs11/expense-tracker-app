"use client";

import React from "react";

export default function SDKPage() {
  const isAndroid =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900">
        📱 Expense Tracker – Android App
      </h1>

      {/* Brief description */}
      <p className="text-gray-700">
        The native Android companion app for Expense Tracker. Track your expenses
        and income on the go – all data stays in sync with your web account via the
        same API.
      </p>

      {/* Device compatibility */}
      <section className="mt-4">
        <h3 className="text-xl font-semibold text-gray-800">
          Device compatibility
        </h3>
        <p className="mt-2 text-gray-600">
          {isAndroid
            ? "✅ Android device detected – you can download and install the APK directly."
            : "⚠️ Open this page on your Android device to install the app."}
        </p>
      </section>

      {/* Download button */}
      <a href="/api/sdk/download">
        <button className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
          Download App (APK)
        </button>
      </a>

      {/* Features */}
      <section className="mt-6">
        <h3 className="text-xl font-semibold text-gray-800">Features</h3>
        <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
          <li>View income &amp; expense history</li>
          <li>Add expenses with category, description, and source</li>
          <li>Add income with place &amp; source</li>
          <li>Dashboard with net balance overview</li>
          <li>All data synced with your web account</li>
        </ul>
      </section>

      {/* Installation steps */}
      <section className="mt-6">
        <h3 className="text-xl font-semibold text-gray-800">
          Install &amp; setup
        </h3>
        <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-600">
          <li>Download the APK on your Android phone.</li>
          <li>
            In <strong>Settings → Security</strong>, allow installation from
            unknown sources if prompted.
          </li>
          <li>Open the installed app and sign in with your account credentials.</li>
          <li>Start tracking expenses and income from your phone.</li>
        </ol>
      </section>

      {/* Developer notes */}
      <section className="mt-6">
        <h3 className="text-xl font-semibold text-gray-800">
          Build from source
        </h3>
        <p className="mt-2 text-gray-600">
          The Android source lives in <strong>android-sdk/</strong>. Build locally with:
        </p>
        <pre className="mt-2 bg-gray-100 p-3 rounded text-sm overflow-x-auto">
          cd android-sdk{"\n"}
          ./gradlew assembleDebug -PWEB_BASE_URL=https://your-deployment.com
        </pre>
        <p className="mt-2 text-gray-600 text-sm">
          The CI pipeline automatically builds and publishes the APK on every push to <code>main</code>.
        </p>
      </section>
    </div>
  );
}