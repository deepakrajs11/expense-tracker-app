package com.example.expensetracker

import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

object SmsTransactionParser {

    private val creditRegex = Regex("\\b(credit(?:ed)?|received|deposited)\\b", RegexOption.IGNORE_CASE)
    private val debitRegex = Regex("\\b(debit(?:ed)?|withdrawn|spent|paid)\\b", RegexOption.IGNORE_CASE)
    private val amountRegexes = listOf(
        Regex("(?:INR|Rs\\.?|₹)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)", RegexOption.IGNORE_CASE),
        Regex("\\b([0-9,]+(?:\\.[0-9]{1,2})?)\\b")
    )

    fun detect(
        sender: String?,
        body: String,
        rule: SmsMappingRule,
        receivedAtMs: Long = System.currentTimeMillis()
    ): SmsDetectedTransaction? {
        val resolvedSender = sender?.trim().orEmpty()
        if (resolvedSender.isBlank()) return null

        val senderPattern = try {
            Regex(rule.senderRegex, RegexOption.IGNORE_CASE)
        } catch (_: Exception) {
            return null
        }

        if (!senderPattern.containsMatchIn(resolvedSender)) return null

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