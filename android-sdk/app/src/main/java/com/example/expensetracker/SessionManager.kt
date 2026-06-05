package com.example.expensetracker

import android.content.Context
import android.content.SharedPreferences

/**
 * Persists the authenticated user details and session cookie in SharedPreferences.
 */
object SessionManager {

    private const val PREFS_NAME = "expense_tracker_session"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USER_EMAIL = "user_email"
    private const val KEY_USER_NAME = "user_name"
    private const val KEY_COOKIE = "session_cookie"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveSession(ctx: Context, id: String, email: String, name: String, cookie: String) {
        prefs(ctx).edit()
            .putString(KEY_USER_ID, id)
            .putString(KEY_USER_EMAIL, email)
            .putString(KEY_USER_NAME, name)
            .putString(KEY_COOKIE, cookie)
            .apply()
    }

    fun clearSession(ctx: Context) {
        prefs(ctx).edit().clear().apply()
    }

    fun isLoggedIn(ctx: Context): Boolean =
        prefs(ctx).getString(KEY_COOKIE, null).isNullOrEmpty().not()

    fun getCookie(ctx: Context): String? =
        prefs(ctx).getString(KEY_COOKIE, null)

    fun getUserName(ctx: Context): String =
        prefs(ctx).getString(KEY_USER_NAME, "") ?: ""

    fun getUserEmail(ctx: Context): String =
        prefs(ctx).getString(KEY_USER_EMAIL, "") ?: ""
}
