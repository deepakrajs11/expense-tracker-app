package com.example.smssdk

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class MappingActivity : AppCompatActivity() {
    private val PREFS = "sms_mappings"
    private val ACCOUNTS_PREF = "sdk_accounts"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val body = intent.getStringExtra("sms_body") ?: ""
        val from = intent.getStringExtra("sms_from") ?: ""
        val promptCategory = intent.getBooleanExtra("prompt_category", false)

        val layout = LinearLayout(this)
        layout.orientation = LinearLayout.VERTICAL

        val title = TextView(this)
        title.text = "Message from: $from"
        val msg = TextView(this)
        msg.text = body

        val accountsLabel = TextView(this)
        accountsLabel.text = "Select account to map to (sync from host or add manually)"

        val accountsList = ListView(this)
        val accounts = AccountStore.getAccounts(this).toMutableList()
        val adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, accounts)
        accountsList.adapter = adapter

        val syncBtn = Button(this)
        syncBtn.text = "Sync accounts from host"
        syncBtn.setOnClickListener {
            // Try to fetch from configured host API (set in prefs key host_api)
            val host = getSharedPreferences("sdk_settings", Context.MODE_PRIVATE).getString("host_api", null)
            if (host != null) {
                Thread {
                    val fetched = AccountStore.fetchAccountsFromHost(host)
                    runOnUiThread {
                        adapter.clear()
                        adapter.addAll(fetched)
                        adapter.notifyDataSetChanged()
                    }
                }.start()
            } else {
                Toast.makeText(this, "Host API not configured", Toast.LENGTH_SHORT).show()
            }
        }

        val addManual = Button(this)
        addManual.text = "Add account manually"
        addManual.setOnClickListener {
            val et = EditText(this)
            et.hint = "Account name"
            AlertDialog.Builder(this)
                .setTitle("Add account")
                .setView(et)
                .setPositiveButton("Add") { _, _ ->
                    val name = et.text.toString()
                    if (name.isNotBlank()) {
                        AccountStore.addAccount(this, name)
                        adapter.add(name)
                        adapter.notifyDataSetChanged()
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        val scanBtn = Button(this)
        scanBtn.text = "Scan / Enter code"
        scanBtn.setOnClickListener {
            val scanIntent = Intent(this, ScannerActivity::class.java)
            startActivityForResult(scanIntent, 200)
        }

        accountsList.setOnItemClickListener { _, _, position, _ ->
            val selected = adapter.getItem(position) ?: return@setOnItemClickListener
            // Save mapping
            MappingStore.saveMapping(from, selected)
            Toast.makeText(this, "Mapped sender to $selected", Toast.LENGTH_SHORT).show()
            setResult(Activity.RESULT_OK)
            finish()
        }

        layout.addView(title)
        layout.addView(msg)
        layout.addView(accountsLabel)
        layout.addView(accountsList)
        layout.addView(syncBtn)
        layout.addView(addManual)
        layout.addView(scanBtn)

        setContentView(layout)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 200 && resultCode == Activity.RESULT_OK) {
            val code = data?.getStringExtra("scanned_code")
            if (!code.isNullOrEmpty()) {
                Toast.makeText(this, "Scanned code: $code", Toast.LENGTH_SHORT).show()
                // In a real integration, associate scanned code with selected account or link flow
            }
        }
    }
}

object MappingStore {
    private const val PREFS = "sms_mappings"
    fun hasMappingFor(sender: String): Boolean {
        val prefs = AppContext.instance.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return prefs.contains(sender)
    }

    fun saveMapping(sender: String, mapping: String) {
        val prefs = AppContext.instance.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit().putString(sender, mapping).apply()
    }

    fun getMappingFor(sender: String): String? {
        val prefs = AppContext.instance.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return prefs.getString(sender, null)
    }
}

object AccountStore {
    private const val PREFS = "sdk_accounts"
    private const val KEY = "accounts"

    fun getAccounts(ctx: Context): List<String> {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY, null) ?: return emptyList()
        return raw.split("||").filter { it.isNotBlank() }
    }

    fun addAccount(ctx: Context, name: String) {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val list = getAccounts(ctx).toMutableList()
        list.add(name)
        prefs.edit().putString(KEY, list.joinToString("||")).apply()
    }

    fun saveAccounts(ctx: Context, accounts: List<String>) {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY, accounts.joinToString("||")).apply()
    }

    fun fetchAccountsFromHost(hostUrl: String): List<String> {
        try {
            val url = java.net.URL(hostUrl)
            val conn = url.openConnection() as java.net.HttpURLConnection
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            conn.requestMethod = "GET"
            conn.connect()
            val code = conn.responseCode
            if (code == 200) {
                val input = conn.inputStream.bufferedReader().use { it.readText() }
                // Expecting simple JSON array of strings
                val arr = org.json.JSONArray(input)
                val out = mutableListOf<String>()
                for (i in 0 until arr.length()) out.add(arr.getString(i))
                return out
            }
        } catch (e: Exception) {
            // ignore
        }
        return emptyList()
    }
}
