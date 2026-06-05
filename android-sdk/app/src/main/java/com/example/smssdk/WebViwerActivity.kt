package com.example.smssdk   // same package as LoginActivity

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class WebViewerActivity : AppCompatActivity() {

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val webView = WebView(this)
        setContentView(webView)

        // Grab the cookie passed from LoginActivity
        val cookie = intent.getStringExtra("cookie")
        if (cookie != null) {
            val cm = CookieManager.getInstance()
            // 👉‑Replace with your real domain (must match the cookie domain)
            cm.setCookie("expense-tracker-app-two-zeta.vercel.app", cookie)
            cm.flush()
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
        }
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = WebViewClient()

        // 👉‑Replace with the mobile entry point of your site
        webView.loadUrl("https://expense-tracker-app-two-zeta.vercel.app/app/dashboard")
    }
}