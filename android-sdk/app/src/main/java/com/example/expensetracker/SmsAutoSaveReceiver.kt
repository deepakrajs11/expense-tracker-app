package com.example.expensetracker

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.concurrent.Executors

class SmsAutoSaveReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_AUTO_SAVE) return

        val transactionId = intent.getStringExtra(EXTRA_TRANSACTION_ID).orEmpty()
        if (transactionId.isBlank()) return

        val transaction = SmsPendingStore.get(context, transactionId) ?: return
        Executors.newSingleThreadExecutor().execute {
            try {
                val cookie = SessionManager.getCookie(context) ?: return@execute
                val saved = saveTransaction(cookie, transaction)
                if (saved) {
                    SmsPendingStore.remove(context, transaction.id)
                    SmsNotificationHelper.cancelNotification(context, transaction.notificationId)
                    cancelAlarm(context, transaction)
                }
            } catch (_: Exception) {
                // Keep the pending transaction so the user can still review it.
            }
        }
    }

    private fun saveTransaction(cookie: String, transaction: SmsDetectedTransaction): Boolean {
        val timestamp = formatTimestamp(transaction.receivedAtMs)
        return try {
            when (transaction.kind) {
                SmsTransactionKind.CREDIT -> {
                    ApiClient.createIncome(
                        cookie = cookie,
                        amount = formatAmount(transaction.amountPaise),
                        place = transaction.place,
                        source = "Auto detected from SMS",
                        date = timestamp.substring(0, 10)
                    )
                }
                SmsTransactionKind.DEBIT -> {
                    ApiClient.createExpense(
                        cookie = cookie,
                        amount = formatAmount(transaction.amountPaise),
                        category = "Auto detected",
                        description = "Detected at $timestamp",
                        place = transaction.place,
                        date = timestamp.substring(0, 10)
                    )
                }
            }
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun cancelAlarm(context: Context, transaction: SmsDetectedTransaction) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, SmsAutoSaveReceiver::class.java).apply {
            action = ACTION_AUTO_SAVE
            putExtra(EXTRA_TRANSACTION_ID, transaction.id)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            transaction.notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
    }

    private fun formatTimestamp(epochMs: Long): String {
        val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Instant.ofEpochMilli(epochMs).atZone(ZoneId.systemDefault()).format(formatter)
        } else {
            formatter.format(java.time.LocalDateTime.now())
        }
    }

    private fun formatAmount(amountPaise: Long): String = "%.2f".format(amountPaise / 100.0)

    companion object {
        const val ACTION_AUTO_SAVE = "com.example.expensetracker.ACTION_AUTO_SAVE_SMS"
        const val EXTRA_TRANSACTION_ID = "extra_transaction_id"
    }
}