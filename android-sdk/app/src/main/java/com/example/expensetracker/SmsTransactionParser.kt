package com.example.expensetracker

import java.math.BigDecimal
import java.math.RoundingMode
import java.util.Locale
import java.util.UUID

object SmsTransactionParser {

    private val creditRegex = Regex("\\b(credit(?:ed)?|received|deposited)\\b", RegexOption.IGNORE_CASE)
    private val debitRegex = Regex("\\b(debit(?:ed)?|withdrawn|spent|paid)\\b", RegexOption.IGNORE_CASE)
    private val amountRegexes = listOf(
        Regex("(?:INR|Rs\\.?|₹)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)", RegexOption.IGNORE_CASE),
        Regex("\\b([0-9,]+(?:\\.[0-9]{1,2})?)\\b")
    )

    // DLT sender IDs vary by carrier prefix/suffix, e.g. "VM-SCBANK-S", "AD-SCBANK", "SCBANK-T".
    // Only the core code (e.g. "SCBANK") is stable, so that's what rules match against.
    fun extractSenderSlug(raw: String): String {
        val trimmed = raw.trim().uppercase(Locale.ROOT)
        if (trimmed.isEmpty()) return trimmed

        val parts = trimmed.split("-").filter { it.isNotBlank() }
        if (parts.size == 1) return parts[0]

        var start = 0
        var end = parts.size
        if (parts.first().length <= 2) start += 1
        if (end - start > 1 && parts.last().length <= 2) end -= 1
        if (start >= end) return trimmed

        return parts.subList(start, end).joinToString("-")
    }

    fun detect(
        sender: String?,
        body: String,
        rule: SmsMappingRule,
        receivedAtMs: Long = System.currentTimeMillis()
    ): SmsDetectedTransaction? {
        val resolvedSender = sender?.trim().orEmpty()
        if (resolvedSender.isBlank()) return null

        val ruleSlug = rule.senderSlug.trim().uppercase(Locale.ROOT)
        if (ruleSlug.isBlank()) return null
        if (extractSenderSlug(resolvedSender) != ruleSlug) return null

        val kind = when {
            creditRegex.containsMatchIn(body) -> SmsTransactionKind.CREDIT
            debitRegex.containsMatchIn(body) -> SmsTransactionKind.DEBIT
            else -> return null
        }

        val amountPaise = extractAmountPaise(body) ?: return null
        val now = System.currentTimeMillis()

        return SmsDetectedTransaction(
            id = UUID.randomUUID().toString(),
            ruleId = rule.id,
            sender = resolvedSender,
            body = body.trim(),
            place = rule.place,
            amountPaise = amountPaise,
            kind = kind,
            receivedAtMs = receivedAtMs,
            notificationId = (receivedAtMs xor amountPaise xor resolvedSender.hashCode().toLong()).toInt(),
            autoSaveAtMs = now + AUTO_SAVE_DELAY_MS
        )
    }

    private fun extractAmountPaise(body: String): Long? {
        for (regex in amountRegexes) {
            val match = regex.find(body) ?: continue
            val value = match.groupValues.getOrNull(1)?.replace(",", "") ?: continue
            val decimal = value.toBigDecimalOrNull() ?: continue
            return decimal.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact()
        }
        return null
    }

    private fun String.toBigDecimalOrNull(): BigDecimal? = try {
        BigDecimal(this)
    } catch (_: Exception) {
        null
    }

    const val AUTO_SAVE_DELAY_MS: Long = 10 * 60 * 1000L
}