package com.example.expensetracker

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView

class DashboardActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_dashboard)

        val bottomNav = findViewById<BottomNavigationView>(R.id.bottomNav)

        // Default fragment
        if (savedInstanceState == null) {
            loadFragment(OverviewFragment())
        }

        bottomNav.setOnItemSelectedListener { item ->
            val fragment: Fragment = when (item.itemId) {
                R.id.nav_overview -> OverviewFragment()
                R.id.nav_expenses -> ExpensesFragment()
                R.id.nav_incomes  -> IncomesFragment()
                R.id.nav_profile  -> ProfileFragment()
                else              -> OverviewFragment()
            }
            loadFragment(fragment)
            true
        }
    }

    private fun loadFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }

    fun logout() {
        val cookie = SessionManager.getCookie(this)
        if (!cookie.isNullOrEmpty()) {
            Thread {
                try { ApiClient.logout(cookie) } catch (_: Exception) {}
            }.start()
        }
        SessionManager.clearSession(this)
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
    }
}
