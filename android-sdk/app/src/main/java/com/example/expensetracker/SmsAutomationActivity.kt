package com.example.expensetracker

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import java.util.Locale
import java.util.concurrent.Executors

class SmsAutomationActivity : AppCompatActivity() {

    private lateinit var tvStatus: TextView
    private lateinit var recyclerView: RecyclerView
    private lateinit var fab: FloatingActionButton
    private val placeAdapter = SmsRuleAdapter(emptyList()) { rule -> onDeleteRule(rule) }
    private var places: List<String> = emptyList()

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { _ ->
            updatePermissionState()
            refreshPlaces()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sms_automation)

        tvStatus = findViewById(R.id.tvStatus)
        recyclerView = findViewById(R.id.recyclerView)
        fab = findViewById(R.id.fab)

        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = placeAdapter

        fab.setOnClickListener { showRuleDialog() }

        updatePermissionState()
        if (hasRequiredPermissions()) {
            refreshPlaces()
        } else {
            requestRequiredPermissions()
        }
    }

    override fun onResume() {
        super.onResume()
        updatePermissionState()
    }

    private fun hasRequiredPermissions(): Boolean {
        val smsGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.RECEIVE_SMS
        ) == PackageManager.PERMISSION_GRANTED

        val notificationGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        return smsGranted && notificationGranted
    }

    private fun requestRequiredPermissions() {
        val requested = mutableListOf(Manifest.permission.RECEIVE_SMS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requested.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(requested.toTypedArray())
    }

    private fun updatePermissionState() {
        tvStatus.text = if (hasRequiredPermissions()) {
            "SMS permission is enabled. Add sender ID mappings below."
        } else {
            "Enable SMS and notification permissions to auto-detect UPI messages."
        }
    }

    private fun refreshPlaces() {
        val cookie = SessionManager.getCookie(this) ?: return
        Executors.newSingleThreadExecutor().execute {
            try {
                val incomePlaces = ApiClient.getIncomes(cookie)
                    .map { it.place.trim() }
                    .filter { it.isNotBlank() }
                    .distinct()
                    .sorted()

                runOnUiThread {
                    places = incomePlaces
                    placeAdapter.update(SmsRuleStore.loadRules(this))
                    if (places.isEmpty()) {
                        tvStatus.text = "Add at least one income place first, then create SMS mappings."
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this, "Could not load income places", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun showRuleDialog() {
        if (places.isEmpty()) {
            Toast.makeText(this, "Create an income place before adding a mapping", Toast.LENGTH_SHORT).show()
            return
        }

        val view = LayoutInflater.from(this).inflate(R.layout.dialog_sms_rule, null)
        val etSenderSlug = view.findViewById<EditText>(R.id.etSenderSlug)
        val spinnerPlace = view.findViewById<Spinner>(R.id.spinnerPlace)
        spinnerPlace.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, places)

        val dialog = AlertDialog.Builder(this)
            .setTitle("Add SMS mapping")
            .setView(view)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .create()

        dialog.setOnShowListener {
            val btnSave = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            btnSave.setOnClickListener {
                val senderSlug = etSenderSlug.text.toString().trim()
                val place = spinnerPlace.selectedItem?.toString().orEmpty()

                if (senderSlug.isBlank()) {
                    etSenderSlug.error = "Required"
                    return@setOnClickListener
                }

                SmsRuleStore.saveRule(this, senderSlug, place)
                placeAdapter.update(SmsRuleStore.loadRules(this))
                dialog.dismiss()
            }
        }

        dialog.show()
    }

    private fun onDeleteRule(rule: SmsMappingRule) {
        SmsRuleStore.deleteRule(this, rule.id)
        placeAdapter.update(SmsRuleStore.loadRules(this))
    }
}