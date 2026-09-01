package com.example.expensetracker

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

object SmsRuleStore {

    private const val PREFS_PREFIX = "sms_rule_store_"
    private const val KEY_RULES = "rules"

    private fun prefs(ctx: Context) =
        ctx.applicationContext.getSharedPreferences(
            PREFS_PREFIX + SessionManager.getUserId(ctx).ifBlank { "guest" },
            Context.MODE_PRIVATE
        )

    fun loadRules(ctx: Context): List<SmsMappingRule> {
        val raw = prefs(ctx).getString(KEY_RULES, "[]") ?: "[]"
        val array = JSONArray(raw)
        return buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                add(
                    SmsMappingRule(
                        id = item.optString("id", UUID.randomUUID().toString()),
                        senderSlug = item.optString("senderSlug", "").trim(),
                        place = item.optString("place", "").trim()
                    )
                )
            }
        }.filter { it.senderSlug.isNotBlank() && it.place.isNotBlank() }
    }

    fun saveRule(ctx: Context, senderSlug: String, place: String): SmsMappingRule {
        val current = loadRules(ctx).toMutableList()
        val rule = SmsMappingRule(
            id = UUID.randomUUID().toString(),
            senderSlug = SmsTransactionParser.extractSenderSlug(senderSlug),
            place = place.trim()
        )
        current.add(rule)
        persist(ctx, current)
        return rule
    }

    fun deleteRule(ctx: Context, ruleId: String) {
        persist(ctx, loadRules(ctx).filterNot { it.id == ruleId })
    }

    private fun persist(ctx: Context, rules: List<SmsMappingRule>) {
        val array = JSONArray()
        rules.forEach { rule ->
            array.put(
                JSONObject().apply {
                    put("id", rule.id)
                    put("senderSlug", rule.senderSlug)
                    put("place", rule.place)
                }
            )
        }
        prefs(ctx).edit().putString(KEY_RULES, array.toString()).apply()
    }
}