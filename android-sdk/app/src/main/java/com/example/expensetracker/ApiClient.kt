package com.example.expensetracker

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * Centralized API client.
 *
 * All calls are synchronous (must be called from a background thread).
 * The caller is responsible for dispatching to a worker thread.
 */
object ApiClient {

    private val baseUrl: String get() = BuildConfig.BASE_URL.trimEnd('/')

    private val cookieJar = object : CookieJar {
        private val store = mutableListOf<Cookie>()

        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            store.removeAll { it.name == it.name }
            store.addAll(cookies)
            // Persist the first cookie value to SessionManager
            cookies.firstOrNull()?.let { c ->
                val raw = "${c.name}=${c.value}"
                SessionManager.saveSession(
                    App.instance,
                    SessionManager.getUserName(App.instance),
                    SessionManager.getUserEmail(App.instance),
                    SessionManager.getUserName(App.instance),
                    raw
                )
            }
        }

        override fun loadForRequest(url: HttpUrl): List<Cookie> = store.toList()
    }

    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .cookieJar(cookieJar)
        .build()

    private val JSON = "application/json; charset=utf-8".toMediaType()

    // ─── Auth ────────────────────────────────────────────────────────────────

    data class User(val id: String, val email: String, val name: String)

    /** Returns the logged-in User or throws an IOException on failure. */
    fun login(email: String, password: String): Pair<User, String> {
        val body = JSONObject().apply {
            put("email", email)
            put("password", password)
        }.toString().toRequestBody(JSON)

        val req = Request.Builder()
            .url("$baseUrl/api/auth/login")
            .post(body)
            .build()

        http.newCall(req).execute().use { resp ->
            val json = JSONObject(resp.body!!.string())
            if (!resp.isSuccessful) {
                throw IOException(json.optString("error", "Login failed"))
            }
            val u = json.getJSONObject("user")
            val user = User(u.getString("id"), u.getString("email"), u.getString("name"))
            val cookie = resp.header("Set-Cookie") ?: ""
            return Pair(user, cookie)
        }
    }

    fun register(name: String, email: String, password: String): Pair<User, String> {
        val body = JSONObject().apply {
            put("name", name)
            put("email", email)
            put("password", password)
        }.toString().toRequestBody(JSON)

        val req = Request.Builder()
            .url("$baseUrl/api/auth/register")
            .post(body)
            .build()

        http.newCall(req).execute().use { resp ->
            val json = JSONObject(resp.body!!.string())
            if (!resp.isSuccessful) {
                throw IOException(json.optString("error", "Registration failed"))
            }
            val u = json.getJSONObject("user")
            val user = User(u.getString("id"), u.getString("email"), u.getString("name"))
            val cookie = resp.header("Set-Cookie") ?: ""
            return Pair(user, cookie)
        }
    }

    fun logout(cookie: String) {
        val req = Request.Builder()
            .url("$baseUrl/api/auth/logout")
            .addHeader("Cookie", cookie)
            .post("{}".toRequestBody(JSON))
            .build()
        http.newCall(req).execute().use { /* consume */ }
    }

    fun checkSession(cookie: String): User? {
        val req = Request.Builder()
            .url("$baseUrl/api/auth/session")
            .addHeader("Cookie", cookie)
            .get()
            .build()
        http.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) return null
            val json = JSONObject(resp.body!!.string())
            if (json.isNull("user")) return null
            val u = json.getJSONObject("user")
            return User(u.getString("id"), u.getString("email"), u.getString("name"))
        }
    }

    // ─── Expenses ────────────────────────────────────────────────────────────

    data class Expense(
        val id: String,
        val amountPaise: Long,
        val category: String,
        val description: String,
        val place: String,
        val date: String
    )

    fun getExpenses(cookie: String): List<Expense> {
        val req = Request.Builder()
            .url("$baseUrl/api/expenses?sort=date_desc")
            .addHeader("Cookie", cookie)
            .get()
            .build()
        http.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) throw IOException("Failed to fetch expenses")
            val json = JSONObject(resp.body!!.string())
            val arr = json.getJSONArray("expenses")
            return (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                Expense(
                    id = o.getString("id"),
                    amountPaise = o.getLong("amountPaise"),
                    category = o.optString("category", ""),
                    description = o.optString("description", ""),
                    place = o.optString("place", ""),
                    date = o.getString("date")
                )
            }
        }
    }

    fun createExpense(
        cookie: String,
        amount: String,
        category: String,
        description: String,
        place: String,
        date: String
    ): Expense {
        val body = JSONObject().apply {
            put("amount", amount)
            put("category", category)
            put("description", description)
            put("place", place)
            put("date", date)
        }.toString().toRequestBody(JSON)

        val req = Request.Builder()
            .url("$baseUrl/api/expenses")
            .addHeader("Cookie", cookie)
            .addHeader("Idempotency-Key", UUID.randomUUID().toString())
            .post(body)
            .build()

        http.newCall(req).execute().use { resp ->
            val json = JSONObject(resp.body!!.string())
            if (!resp.isSuccessful) throw IOException(json.optString("error", "Failed to create expense"))
            val o = json.getJSONObject("expense")
            return Expense(
                id = o.getString("id"),
                amountPaise = o.getLong("amountPaise"),
                category = o.optString("category", ""),
                description = o.optString("description", ""),
                place = o.optString("place", ""),
                date = o.getString("date")
            )
        }
    }

    // ─── Incomes ─────────────────────────────────────────────────────────────

    data class Income(
        val id: String,
        val amountPaise: Long,
        val place: String,
        val source: String,
        val date: String
    )

    fun getIncomes(cookie: String): List<Income> {
        val req = Request.Builder()
            .url("$baseUrl/api/incomes?sort=date_desc")
            .addHeader("Cookie", cookie)
            .get()
            .build()
        http.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) throw IOException("Failed to fetch incomes")
            val json = JSONObject(resp.body!!.string())
            val arr = json.getJSONArray("incomes")
            return (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                Income(
                    id = o.getString("id"),
                    amountPaise = o.getLong("amountPaise"),
                    place = o.optString("place", ""),
                    source = o.optString("source", ""),
                    date = o.getString("date")
                )
            }
        }
    }

    fun createIncome(
        cookie: String,
        amount: String,
        place: String,
        source: String,
        date: String
    ): Income {
        val body = JSONObject().apply {
            put("amount", amount)
            put("place", place)
            put("source", source)
            put("date", date)
        }.toString().toRequestBody(JSON)

        val req = Request.Builder()
            .url("$baseUrl/api/incomes")
            .addHeader("Cookie", cookie)
            .addHeader("Idempotency-Key", UUID.randomUUID().toString())
            .post(body)
            .build()

        http.newCall(req).execute().use { resp ->
            val json = JSONObject(resp.body!!.string())
            if (!resp.isSuccessful) throw IOException(json.optString("error", "Failed to create income"))
            val o = json.getJSONObject("income")
            return Income(
                id = o.getString("id"),
                amountPaise = o.getLong("amountPaise"),
                place = o.optString("place", ""),
                source = o.optString("source", ""),
                date = o.getString("date")
            )
        }
    }
}
