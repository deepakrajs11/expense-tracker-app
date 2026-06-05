package com.example.smssdk   // keep the original package

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType   // ✅ Kotlin extension
import org.json.JSONObject
import java.io.IOException

class LoginActivity : AppCompatActivity() {

    private val client = OkHttpClient()
    // 👉‑Replace with your real host (dev, staging or prod)
    private val baseUrl = "https://expense-tracker-app-two-zeta.vercel.app/api/auth"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        val emailEt = findViewById<EditText>(R.id.etEmail)
        val pwdEt   = findViewById<EditText>(R.id.etPassword)
        val btnLogin = findViewById<Button>(R.id.btnLogin)

        btnLogin.setOnClickListener {
            val email = emailEt.text.toString().trim()
            val password = pwdEt.text.toString().trim()
            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Enter email & password", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            performLogin(email, password)
        }
    }

    private fun performLogin(email: String, password: String) {
        val json = JSONObject().apply {
            put("email", email)
            put("password", password)
        }

        // ✅ Use the Kotlin extension to create the MediaType
        val requestBody = RequestBody.create(
            "application/json; charset=utf-8".toMediaType(),
            json.toString()
        )

        val request = Request.Builder()
            .url("$baseUrl/login")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                runOnUiThread {
                    Toast.makeText(this@LoginActivity, "Network error", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) {
                    runOnUiThread {
                        Toast.makeText(this@LoginActivity, "Login failed", Toast.LENGTH_SHORT).show()
                    }
                    return
                }

                // Pass the session cookie to the WebView activity
                val cookie = response.header("Set-Cookie")
                val intent = Intent(this@LoginActivity, WebViewerActivity::class.java)
                intent.putExtra("cookie", cookie)
                startActivity(intent)
                finish()
            }
        })
    }
}