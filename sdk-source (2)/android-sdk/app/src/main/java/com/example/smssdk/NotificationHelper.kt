package com.example.smssdk

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

object NotificationHelper {
    private const val CHANNEL_ID = "sms_sdk_channel"
    private const val CHANNEL_NAME = "SMS SDK Notifications"

    fun ensureChannel(ctx: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                val chan = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH)
                nm.createNotificationChannel(chan)
            }
        }
    }

    fun showMappingNotification(ctx: Context, from: String, body: String, notifId: Int = 1001) {
        ensureChannel(ctx)
        val mapIntent = Intent(ctx, MappingActivity::class.java).apply {
            putExtra("sms_body", body)
            putExtra("sms_from", from)
        }
        val piMap = PendingIntent.getActivity(ctx, notifId + 1, mapIntent, PendingIntent.FLAG_UPDATE_CURRENT or pendingFlag())

        val addCatIntent = Intent(ctx, MappingActivity::class.java).apply {
            putExtra("sms_body", body)
            putExtra("sms_from", from)
            putExtra("prompt_category", true)
        }
        val piCat = PendingIntent.getActivity(ctx, notifId + 2, addCatIntent, PendingIntent.FLAG_UPDATE_CURRENT or pendingFlag())

        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(ctx, CHANNEL_ID)
        } else {
            Notification.Builder(ctx)
        }
        builder.setContentTitle("SMS parsed from $from")
            .setContentText(body.take(60))
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .addAction(android.R.drawable.ic_menu_edit, "Map now", piMap)
            .addAction(android.R.drawable.ic_menu_add, "Add category", piCat)
            .setAutoCancel(true)

        nm.notify(notifId, builder.build())
    }

    private fun pendingFlag(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
    }
}
