package com.example.smssdk

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

        // Pull the cookie passed from LoginActivity
        val cookie = intent.getStringExtra("cookie")
        if (cookie != null) {
            val cm = CookieManager.getInstance()
            cm.setCookie("expense-tracker-app-two-zeta.vercel.app", cookie)   // <<‑‑ same domain as in LoginActivity
            cm.flush()
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
        }
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = WebViewClient()

        // Load the mobile dashboard
        webView.loadUrl("https://expense-tracker-app-two-zeta.vercel.app/app/dashboard")
    }
}