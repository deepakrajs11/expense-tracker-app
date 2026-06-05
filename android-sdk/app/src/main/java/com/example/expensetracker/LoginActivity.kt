package com.example.expensetracker

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors

class LoginActivity : AppCompatActivity() {

    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnLogin: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var tvRegister: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        etEmail = findViewById(R.id.etEmail)
        etPassword = findViewById(R.id.etPassword)
        btnLogin = findViewById(R.id.btnLogin)
        progressBar = findViewById(R.id.progressBar)
        tvRegister = findViewById(R.id.tvRegister)

        btnLogin.setOnClickListener { attemptLogin() }
        tvRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
    }

    private fun attemptLogin() {
        val email = etEmail.text.toString().trim()
        val password = etPassword.text.toString()

        if (email.isEmpty()) { etEmail.error = "Email is required"; return }
        if (password.isEmpty()) { etPassword.error = "Password is required"; return }

        setLoading(true)

        Executors.newSingleThreadExecutor().execute {
            try {
                val (user, cookie) = ApiClient.login(email, password)
                SessionManager.saveSession(this, user.id, user.email, user.name, cookie)
                runOnUiThread {
                    setLoading(false)
                    startActivity(Intent(this, DashboardActivity::class.java))
                    finish()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    setLoading(false)
                    Toast.makeText(this, e.message ?: "Login failed", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        btnLogin.isEnabled = !loading
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }
}
