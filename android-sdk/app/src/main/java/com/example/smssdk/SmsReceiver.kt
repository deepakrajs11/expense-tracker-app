package com.example.smssdk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.telephony.SmsMessage
import android.util.Log

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val bundle: Bundle? = intent.extras
        try {
            if (bundle != null) {
                val pdus = bundle.get("pdus") as Array<*>
                for (pdu in pdus) {
                    val msg = SmsMessage.createFromPdu(pdu as ByteArray)
                    val from = msg.originatingAddress ?: ""
                    val body = msg.messageBody ?: ""
                    Log.d("SmsReceiver", "SMS from=$from body=$body")

                    val parsed = SmsParser.parse(body)
                    if (parsed != null) {
                        // If mapping unknown, show notification to prompt mapping
                        if (!MappingStore.hasMappingFor(from)) {
                            NotificationHelper.showMappingNotification(context, from, body)
                        } else {
                            // Use mapping to extract structured transaction
                            val tx = SmsParser.applyMapping(body, MappingStore.getMappingFor(from))
                            // Broadcast parsed transaction so host apps may pick it up
                            val b = Intent("com.example.smssdk.TRANSACTION_PARSED")
                            b.putExtra("from", from)
                            b.putExtra("body", body)
                            b.putExtra("amount", tx?.amount)
                            b.putExtra("type", tx?.type)
                            context.sendBroadcast(b)

                            // Also show notification prompting to add category (optional)
                            NotificationHelper.showMappingNotification(context, from, body)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("SmsReceiver", "Error processing SMS", e)
        }
    }
}
