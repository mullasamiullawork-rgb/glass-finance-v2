package com.samiulla.glassfinance.autotrack.core

import java.util.Locale
import java.util.UUID
import kotlin.math.abs

class Categorizer(private val userRules: Map<String, String> = emptyMap()) {
    companion object {
        fun key(name: String?): String = (name ?: "").lowercase(Locale.ROOT).replace(Regex("""[^a-z0-9]+"""), " ").trim()
        private val RULES: List<Pair<String, Regex>> = listOf(
            "cat_groceries" to Regex("""\b(grocery|groceries|kirana|supermarket|dmart|bigbasket|blinkit|zepto|instamart|jiomart|ratnadeep)\b"""),
            "cat_food" to Regex("""\b(tea|chai|coffee|cafe|restaurant|hotel|dhaba|bakery|biryani|pizza|burger|swiggy|zomato|food|kitchen)\b"""),
            "cat_transport" to Regex("""\b(petrol|fuel|diesel|hpcl|bpcl|iocl|bus|uber|ola|rapido|auto|taxi|cab|metro|irctc|fastag|toll)\b"""),
            "cat_health" to Regex("""\b(hospital|clinic|medical|pharmacy|apollo|medplus|netmeds|pharmeasy|1mg|lab|doctor)\b"""),
            "cat_bills" to Regex("""\b(recharge|jio|airtel|vodafone|bsnl|electricity|apspdcl|power|gas|broadband|internet|fibernet|dth|billdesk)\b"""),
            "cat_education" to Regex("""\b(school|college|university|institute|academy|coaching|tuition|exam|fees|books|stationery)\b"""),
            "cat_subscriptions" to Regex("""\b(netflix|spotify|youtube|prime video|hotstar|jiocinema|google play|subscription)\b"""),
            "cat_entertainment" to Regex("""\b(bookmyshow|pvr|inox|cinema|movie|gaming)\b"""),
            "cat_shopping" to Regex("""\b(amazon|flipkart|myntra|ajio|meesho|nykaa|store|mall|croma|decathlon|shopping)\b"""),
        )
    }
    fun categorize(kind: TxKind, counterparty: String?): String? = when (kind) {
        TxKind.REFUND, TxKind.REVERSAL -> "cat_refund"
        TxKind.TRANSFER, TxKind.UNKNOWN -> null
        TxKind.INCOME -> userRules[key(counterparty)] ?: "cat_received"
        TxKind.EXPENSE -> { val k = key(counterparty); userRules[k] ?: RULES.firstOrNull { it.second.containsMatchIn(" $k ") }?.first ?: "cat_other" }
    }
}

object Classifier {
    fun kind(p: ParsedPayment): TxKind = p.kindHint ?: when (p.direction) { Direction.DEBIT -> TxKind.EXPENSE; Direction.CREDIT -> TxKind.INCOME; Direction.UNKNOWN -> TxKind.UNKNOWN }
}

sealed class ReconcileResult {
    data class Created(val tx: DetectedTx) : ReconcileResult()
    data class Updated(val before: DetectedTx, val tx: DetectedTx) : ReconcileResult()
    data class Duplicate(val existing: DetectedTx) : ReconcileResult()
}

class Reconciler(
    private val crossSourceWindowMs: Long = 15 * 60_000L,
    private val sameSourceWindowMs: Long = 90_000L,
    private val clock: () -> Long = System::currentTimeMillis,
    private val newId: () -> String = { "auto_" + UUID.randomUUID().toString().replace("-", "").take(16) },
) {
    fun reconcile(p: ParsedPayment, existing: List<DetectedTx>, categorizer: Categorizer = Categorizer()): ReconcileResult {
        val strong = existing.firstOrNull { e -> !e.deleted && ((p.upiRef != null && (e.upiRef == p.upiRef || e.txnId == p.upiRef)) || (p.txnId != null && (e.txnId == p.txnId || e.upiRef == p.txnId))) }
        if (strong != null) return mergeOrDuplicate(strong, p)
        val match = existing.filter { e ->
            !e.deleted && e.amountPaise == p.amountPaise && (e.direction == p.direction || e.direction == Direction.UNKNOWN || p.direction == Direction.UNKNOWN) &&
                !((e.upiRef != null && p.upiRef != null && e.upiRef != p.upiRef) || (e.txnId != null && p.txnId != null && e.txnId != p.txnId)) &&
                abs(e.occurredAt - p.occurredAt) <= (if (p.sourceType !in e.sources) crossSourceWindowMs else sameSourceWindowMs)
        }.minByOrNull { abs(it.occurredAt - p.occurredAt) }
        if (match != null && (p.sourceType !in match.sources || Categorizer.key(match.counterparty) == Categorizer.key(p.counterparty))) return mergeOrDuplicate(match, p)
        val kind = Classifier.kind(p); val status = if (kind == TxKind.REVERSAL && p.direction == Direction.CREDIT) TxStatus.SUCCESS else p.status
        return ReconcileResult.Created(DetectedTx(id = newId(), amountPaise = p.amountPaise, direction = p.direction, kind = kind, status = status, counterparty = p.counterparty, upiRef = p.upiRef, txnId = p.txnId, accountHint = p.accountHint, bankName = p.bankName, availableBalancePaise = p.availableBalancePaise, appName = p.appName, sources = setOf(p.sourceType), sourceCount = 1, verification = verificationFor(setOf(p.sourceType)), categoryId = categorizer.categorize(kind, p.counterparty), occurredAt = p.occurredAt, updatedAt = clock()))
    }
    private fun mergeOrDuplicate(e: DetectedTx, p: ParsedPayment): ReconcileResult {
        val sources = e.sources + p.sourceType
        val newStatus = when { e.status == p.status -> e.status; p.status == TxStatus.REVERSED -> TxStatus.REVERSED; e.status == TxStatus.PENDING -> p.status; e.status == TxStatus.FAILED && p.status == TxStatus.SUCCESS -> TxStatus.SUCCESS; else -> e.status }
        val merged = e.copy(status = newStatus, counterparty = e.counterparty ?: p.counterparty, upiRef = e.upiRef ?: p.upiRef, txnId = e.txnId ?: p.txnId, bankName = e.bankName ?: p.bankName, availableBalancePaise = e.availableBalancePaise ?: e.availableBalancePaise, sources = sources, sourceCount = e.sourceCount + 1, verification = maxOf(e.verification, verificationFor(sources)))
        return if (merged.copy(sourceCount = e.sourceCount, updatedAt = e.updatedAt) != e) ReconcileResult.Updated(e, merged.copy(updatedAt = clock())) else ReconcileResult.Duplicate(e)
    }
    companion object {
        fun verificationFor(sources: Set<SourceType>): Verification = when {
            sources.any { it == SourceType.STATEMENT_IMPORT || it == SourceType.ACCOUNT_AGGREGATOR } -> Verification.BANK_VERIFIED
            SourceType.BANK_SMS_NOTIFICATION in sources || sources.size >= 2 -> Verification.CONFIRMED
            else -> Verification.PROVISIONAL
        }
    }
}
