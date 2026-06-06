package com.example.expensetracker

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object SmsPendingStore {

    private const val PREFS_PREFIX = "sms_pending_store_"
    private const val KEY_ITEMS = "items"

    private fun prefs(ctx: Context) =
        ctx.applicationContext.getSharedPreferences(
            PREFS_PREFIX + SessionManager.getUserId(ctx).ifBlank { "guest" },
            Context.MODE_PRIVATE
        )

    fun load(ctx: Context): List<SmsDetectedTransaction> {
        val raw = prefs(ctx).getString(KEY_ITEMS, "[]") ?: "[]"
        val array = JSONArray(raw)
        return buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                add(item.toDetectedTransaction())
            }
        }
    }

    fun get(ctx: Context, transactionId: String): SmsDetectedTransaction? =
        load(ctx).firstOrNull { it.id == transactionId }

    fun save(ctx: Context, transaction: SmsDetectedTransaction) {
        persist(ctx, load(ctx).filterNot { it.id == transaction.id } + transaction)
    }

    fun remove(ctx: Context, transactionId: String) {
        persist(ctx, load(ctx).filterNot { it.id == transactionId })
    }

    private fun persist(ctx: Context, transactions: List<SmsDetectedTransaction>) {
        val array = JSONArray()
        transactions.forEach { transaction ->
            array.put(transaction.toJson())
        }
        prefs(ctx).edit().putString(KEY_ITEMS, array.toString()).apply()
    }

    private fun JSONObject.toDetectedTransaction(): SmsDetectedTransaction =
        SmsDetectedTransaction(
            id = optString("id"),
            ruleId = optString("ruleId"),
            sender = optString("sender"),
            body = optString("body"),
            place = optString("place"),
            amountPaise = optLong("amountPaise"),
            kind = SmsTransactionKind.valueOf(optString("kind", SmsTransactionKind.CREDIT.name)),
            receivedAtMs = optLong("receivedAtMs"),
            notificationId = optInt("notificationId"),
            autoSaveAtMs = optLong("autoSaveAtMs")
        )

    private fun SmsDetectedTransaction.toJson(): JSONObject =
        JSONObject().apply {
            put("id", id)
            put("ruleId", ruleId)
            put("sender", sender)
            put("body", body)
            put("place", place)
            put("amountPaise", amountPaise)
            put("kind", kind.name)
            put("receivedAtMs", receivedAtMs)
            put("notificationId", notificationId)
            put("autoSaveAtMs", autoSaveAtMs)
        }
}