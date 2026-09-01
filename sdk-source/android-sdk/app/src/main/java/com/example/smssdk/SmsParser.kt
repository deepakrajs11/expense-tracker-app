package com.example.smssdk

object SmsParser {
    data class ParsedTx(val amount: Double?, val type: String?, val raw: String)

    // Very simple heuristic: looks for currency amounts in text
    fun parse(body: String): ParsedTx? {
        val regex = Regex("([0-9]+[.,][0-9]{2})")
        val match = regex.find(body)
        return if (match != null) {
            val amtStr = match.value.replace(',', '.')
            val amount = try { amtStr.toDouble() } catch (e: Exception) { null }
            val type = if (body.contains("credit", true) || body.contains("credited", true)) "credit" else if (body.contains("debit", true) || body.contains("debited", true)) "debit" else null
            ParsedTx(amount, type, body)
        } else null
    }

    fun applyMapping(body: String, mapping: String): ParsedTx? {
        // For now mapping is unused; return parse
        return parse(body)
    }
}
