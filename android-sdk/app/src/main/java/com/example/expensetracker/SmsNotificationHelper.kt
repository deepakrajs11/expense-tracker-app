package com.example.expensetracker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object SmsNotificationHelper {

    private const val CHANNEL_ID = "sms_auto_detect"
    private const val CHANNEL_NAME = "SMS auto-detection"
    private const val CHANNEL_DESC = "Alerts for SMS-based income and expense detection"

    fun ensureChannel(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH)
        channel.description = CHANNEL_DESC
        manager.createNotificationChannel(channel)
    }

    fun canPostNotifications(ctx: Context): Boolean =
        NotificationManagerCompat.from(ctx).areNotificationsEnabled()

    fun showReviewNotification(ctx: Context, transaction: SmsDetectedTransaction) {
        ensureChannel(ctx)

        val intent = Intent(ctx, SmsReviewActivity::class.java).apply {
            putExtra(SmsReviewActivity.EXTRA_TRANSACTION_ID, transaction.id)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            ctx,
            transaction.notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (transaction.kind == SmsTransactionKind.CREDIT) {
            "Income detected from SMS"
        } else {
            "Expense detected from SMS"
        }
        val amount = "₹%.2f".format(transaction.amountPaise / 100.0)
        val text = "${transaction.sender} • $amount • ${transaction.place}"

        val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_more)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(transaction.body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(ctx).notify(transaction.notificationId, notification)
    }

    fun cancelNotification(ctx: Context, notificationId: Int) {
        NotificationManagerCompat.from(ctx).cancel(notificationId)
    }
}