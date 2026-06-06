package com.example.expensetracker

enum class SmsTransactionKind {
    CREDIT,
    DEBIT
}

data class SmsMappingRule(
    val id: String,
    val senderRegex: String,
    val place: String
)

data class SmsDetectedTransaction(
    val id: String,
    val ruleId: String,
    val sender: String,
    val body: String,
    val place: String,
    val amountPaise: Long,
    val kind: SmsTransactionKind,
    val receivedAtMs: Long,
    val notificationId: Int,
    val autoSaveAtMs: Long
)