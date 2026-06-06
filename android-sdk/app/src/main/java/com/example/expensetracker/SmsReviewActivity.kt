package com.example.expensetracker

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.concurrent.Executors

class SmsReviewActivity : AppCompatActivity() {

    private lateinit var transaction: SmsDetectedTransaction

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sms_review)

        val transactionId = intent.getStringExtra(EXTRA_TRANSACTION_ID).orEmpty()
        transaction = SmsPendingStore.get(this, transactionId) ?: run {
            finish()
            return
        }

        val tvTitle = findViewById<TextView>(R.id.tvTitle)
        val tvMeta = findViewById<TextView>(R.id.tvMeta)
        val tvBody = findViewById<TextView>(R.id.tvBody)
        val etCategory = findViewById<EditText>(R.id.etCategory)
        val btnSave = findViewById<Button>(R.id.btnSave)
        val btnDismiss = findViewById<Button>(R.id.btnDismiss)

        tvTitle.text = if (transaction.kind == SmsTransactionKind.CREDIT) {
            "Review auto-detected income"
        } else {
            "Review auto-detected expense"
        }
        tvMeta.text = buildString {
            append("Sender: ${transaction.sender}\n")
            append("Place: ${transaction.place}\n")
            append("Amount: ${formatAmount(transaction.amountPaise)}\n")
            append("Time: ${formatTime(transaction.receivedAtMs)}")
        }
        tvBody.text = transaction.body

        if (transaction.kind == SmsTransactionKind.CREDIT) {
            etCategory.hint = "Income source label"
            etCategory.setText("Auto detected from SMS")
        } else {
            etCategory.hint = "Category"
        }

        btnSave.setOnClickListener { saveTransaction(etCategory.text.toString().trim()) }
        btnDismiss.setOnClickListener { finish() }
    }

    private fun saveTransaction(category: String) {
        val cookie = SessionManager.getCookie(this) ?: run {
            Toast.makeText(this, "Please log in again", Toast.LENGTH_SHORT).show()
            return
        }

        val resolvedCategory = if (transaction.kind == SmsTransactionKind.DEBIT && category.isBlank()) {
            "Auto detected"
        } else {
            category.ifBlank { "Auto detected from SMS" }
        }

        Executors.newSingleThreadExecutor().execute {
            try {
                when (transaction.kind) {
                    SmsTransactionKind.CREDIT -> {
                        ApiClient.createIncome(
                            cookie = cookie,
                            amount = formatAmount(transaction.amountPaise),
                            place = transaction.place,
                            source = resolvedCategory,
                            date = formatDate(transaction.receivedAtMs)
                        )
                    }
                    SmsTransactionKind.DEBIT -> {
                        ApiClient.createExpense(
                            cookie = cookie,
                            amount = formatAmount(transaction.amountPaise),
                            category = resolvedCategory,
                            description = formatTime(transaction.receivedAtMs),
                            place = transaction.place,
                            date = formatDate(transaction.receivedAtMs)
                        )
                    }
                }

                SmsPendingStore.remove(this, transaction.id)
                SmsNotificationHelper.cancelNotification(this, transaction.notificationId)
                runOnUiThread { finish() }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this, e.message ?: "Could not save transaction", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun formatAmount(amountPaise: Long): String = "%.2f".format(amountPaise / 100.0)

    private fun formatDate(epochMs: Long): String =
        Instant.ofEpochMilli(epochMs).atZone(ZoneId.systemDefault()).toLocalDate().toString()

    private fun formatTime(epochMs: Long): String {
        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        return Instant.ofEpochMilli(epochMs).atZone(ZoneId.systemDefault()).format(formatter)
    }

    companion object {
        const val EXTRA_TRANSACTION_ID = "extra_transaction_id"
    }
}