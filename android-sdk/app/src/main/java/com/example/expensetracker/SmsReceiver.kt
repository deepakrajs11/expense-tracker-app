package com.example.expensetracker

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        if (SessionManager.getCookie(context).isNullOrBlank()) return
        val rules = SmsRuleStore.loadRules(context)
        if (rules.isEmpty()) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isEmpty()) return

        val sender = messages.firstOrNull()?.originatingAddress.orEmpty()
        val body = messages.joinToString(separator = "") { it.messageBody.orEmpty() }
        if (body.isBlank()) return

        val matchedRule = rules.firstOrNull { rule ->
            SmsTransactionParser.detect(sender, body, rule) != null
        } ?: return

        val transaction = SmsTransactionParser.detect(sender, body, matchedRule) ?: return
        SmsPendingStore.save(context, transaction)
        SmsNotificationHelper.showReviewNotification(context, transaction)
        scheduleAutoSave(context, transaction)
    }

    private fun scheduleAutoSave(context: Context, transaction: SmsDetectedTransaction) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, SmsAutoSaveReceiver::class.java).apply {
            action = SmsAutoSaveReceiver.ACTION_AUTO_SAVE
            putExtra(SmsAutoSaveReceiver.EXTRA_TRANSACTION_ID, transaction.id)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            transaction.notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val triggerAt = transaction.autoSaveAtMs
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
    }
}