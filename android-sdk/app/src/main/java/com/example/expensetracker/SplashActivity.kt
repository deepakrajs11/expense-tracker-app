package com.example.expensetracker

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors

/**
 * Entry point. Checks the persisted session on a background thread and
 * routes the user to Login or Dashboard.
 */
class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val executor = Executors.newSingleThreadExecutor()
        executor.execute {
            val cookie = SessionManager.getCookie(this)
            val isValid = if (!cookie.isNullOrEmpty()) {
                try {
                    ApiClient.checkSession(cookie) != null
                } catch (e: Exception) {
                    false
                }
            } else false

            runOnUiThread {
                if (isValid) {
                    startActivity(Intent(this, DashboardActivity::class.java))
                } else {
                    SessionManager.clearSession(this)
                    startActivity(Intent(this, LoginActivity::class.java))
                }
                finish()
            }
        }
    }
}
