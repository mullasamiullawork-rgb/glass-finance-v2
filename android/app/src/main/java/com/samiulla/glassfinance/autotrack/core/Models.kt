package com.samiulla.glassfinance.autotrack.core

enum class Direction { DEBIT, CREDIT, UNKNOWN }
enum class TxKind { EXPENSE, INCOME, REFUND, TRANSFER, REVERSAL, UNKNOWN }
enum class TxStatus { SUCCESS, PENDING, FAILED, REVERSED }
enum class SourceType(val rank: Int) { APP_INITIATED_INTENT(1), UPI_APP_NOTIFICATION(2), BANK_SMS_NOTIFICATION(3), STATEMENT_IMPORT(4), ACCOUNT_AGGREGATOR(5) }
enum class Verification { PROVISIONAL, CONFIRMED, BANK_VERIFIED }

data class RawNotification(val packageName: String, val title: String?, val text: String?, val bigText: String?, val subText: String?, val postedAt: Long) {
    val body: String get() = listOfNotNull(title, bigText?.takeIf { it.isNotBlank() } ?: text, subText).map { it.trim() }.filter { it.isNotEmpty() }.distinct().joinToString("\n")
}

data class ParsedPayment(
    val amountPaise: Long, val direction: Direction, val status: TxStatus, val kindHint: TxKind? = null,
    val counterparty: String? = null, val upiRef: String? = null, val txnId: String? = null,
    val accountHint: String? = null, val bankName: String? = null, val availableBalancePaise: Long? = null,
    val appName: String, val sourcePackage: String, val sourceType: SourceType, val occurredAt: Long, val confidence: Int,
)

data class DetectedTx(
    val id: String, val amountPaise: Long, val direction: Direction, val kind: TxKind, val status: TxStatus,
    val counterparty: String?, val upiRef: String?, val txnId: String?, val accountHint: String?, val bankName: String?,
    val availableBalancePaise: Long?, val appName: String, val sources: Set<SourceType>, val sourceCount: Int,
    val verification: Verification, val categoryId: String?, val occurredAt: Long, val updatedAt: Long,
    val userEdited: Boolean = false, val deleted: Boolean = false,
) {
    fun countsInLedger(): Boolean = !deleted && status == TxStatus.SUCCESS && kind != TxKind.UNKNOWN
}
