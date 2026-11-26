package com.samiulla.glassfinance.autotrack.data

import android.content.Context
import androidx.room.*
import com.samiulla.glassfinance.autotrack.core.*

@Entity(tableName = "detected_tx")
data class DetectedTxEntity(
    @PrimaryKey val id: String, val amountPaise: Long, val direction: String, val kind: String, val status: String,
    val counterparty: String?, val upiRef: String?, val txnId: String?, val accountHint: String?, val bankName: String?,
    val availableBalancePaise: Long?, val appName: String, val sources: String, val sourceCount: Int,
    val verification: String, val categoryId: String?, val occurredAt: Long, val updatedAt: Long,
    val userEdited: Boolean, val deleted: Boolean, val note: String? = null,
) {
    fun toCore() = DetectedTx(id, amountPaise, Direction.valueOf(direction), TxKind.valueOf(kind), TxStatus.valueOf(status), counterparty, upiRef, txnId, accountHint, bankName, availableBalancePaise, appName, sources.split(",").filter { it.isNotBlank() }.map { SourceType.valueOf(it) }.toSet(), sourceCount, Verification.valueOf(verification), categoryId, occurredAt, updatedAt, userEdited, deleted)
    companion object {
        fun from(t: DetectedTx, note: String? = null) = DetectedTxEntity(t.id, t.amountPaise, t.direction.name, t.kind.name, t.status.name, t.counterparty, t.upiRef, t.txnId, t.accountHint, t.bankName, t.availableBalancePaise, t.appName, t.sources.joinToString(",") { it.name }, t.sourceCount, t.verification.name, t.categoryId, t.occurredAt, t.updatedAt, t.userEdited, t.deleted, note)
    }
}

@Entity(tableName = "detection_log")
data class DetectionLogEntity(@PrimaryKey(autoGenerate = true) val id: Long = 0, val at: Long, val packageName: String, val outcome: String, val reason: String, val txId: String?)

@Entity(tableName = "merchant_rule")
data class MerchantRuleEntity(@PrimaryKey val merchantKey: String, val categoryId: String, val updatedAt: Long)

@Entity(tableName = "app_state")
data class AppStateEntity(@PrimaryKey val key: String, val json: String, val updatedAt: Long)

data class OutcomeCount(val outcome: String, val n: Int)

@Dao
interface GlassDao {
    @Query("SELECT * FROM detected_tx ORDER BY occurredAt DESC") fun all(): List<DetectedTxEntity>
    @Query("SELECT * FROM detected_tx WHERE updatedAt >= :since ORDER BY occurredAt DESC") fun changedSince(since: Long): List<DetectedTxEntity>
    @Query("SELECT * FROM detected_tx WHERE occurredAt >= :since") fun candidates(since: Long): List<DetectedTxEntity>
    @Query("SELECT * FROM detected_tx WHERE id = :id LIMIT 1") fun get(id: String): DetectedTxEntity?
    @Insert(onConflict = OnConflictStrategy.REPLACE) fun upsert(e: DetectedTxEntity)
    @Insert fun log(e: DetectionLogEntity)
    @Query("SELECT * FROM detection_log ORDER BY at DESC LIMIT :limit") fun recentLog(limit: Int): List<DetectionLogEntity>
    @Query("SELECT outcome, COUNT(*) AS n FROM detection_log GROUP BY outcome") fun outcomeCounts(): List<OutcomeCount>
    @Query("SELECT MAX(at) FROM detection_log WHERE outcome IN ('CREATED','UPDATED')") fun lastDetection(): Long?
    @Query("DELETE FROM detection_log WHERE at < :before") fun pruneLog(before: Long)
    @Query("SELECT * FROM merchant_rule") fun rules(): List<MerchantRuleEntity>
    @Insert(onConflict = OnConflictStrategy.REPLACE) fun putRule(r: MerchantRuleEntity)
    @Query("SELECT * FROM app_state WHERE `key` = :key LIMIT 1") fun state(key: String): AppStateEntity?
    @Insert(onConflict = OnConflictStrategy.REPLACE) fun putState(s: AppStateEntity)
    @Query("DELETE FROM detected_tx") fun clearTx()
    @Query("DELETE FROM detection_log") fun clearLog()
    @Query("DELETE FROM merchant_rule") fun clearRules()
    @Query("DELETE FROM app_state") fun clearState()
}

@Database(entities = [DetectedTxEntity::class, DetectionLogEntity::class, MerchantRuleEntity::class, AppStateEntity::class], version = 1, exportSchema = false)
abstract class GlassDb : RoomDatabase() {
    abstract fun dao(): GlassDao
    companion object {
        @Volatile private var inst: GlassDb? = null
        fun get(ctx: Context): GlassDb = inst ?: synchronized(this) { inst ?: Room.databaseBuilder(ctx.applicationContext, GlassDb::class.java, "glass_finance.db").build().also { inst = it } }
        fun resetForTests() { inst?.close(); inst = null }
    }
}
