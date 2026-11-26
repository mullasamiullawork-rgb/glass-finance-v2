package com.samiulla.glassfinance.autotrack

import android.content.ComponentName
import android.content.Intent
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.os.Build
import android.provider.Settings
import android.service.notification.NotificationListenerService
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.samiulla.glassfinance.autotrack.core.*
import com.samiulla.glassfinance.autotrack.data.AppStateEntity
import org.json.JSONArray
import java.io.File
import java.io.FileOutputStream

@CapacitorPlugin(name = "AutoTrack")
class AutoTrackPlugin : Plugin() {
    private val repo by lazy { AutoTrackRepository.get(context) }
    private val dao get() = repo.db.dao()

    override fun load() {
        repo.listener = { tx, change -> val o = toJs(tx); o.put("change", change); activity?.runOnUiThread { notifyListeners("detected", o) } }
    }

    private fun bg(call: PluginCall, block: () -> Unit) = repo.executor.execute {
        try { block() } catch (e: Exception) { call.reject(e.message ?: e.javaClass.simpleName) }
    }

    @PluginMethod fun list(call: PluginCall) = bg(call) {
        val since = call.getLong("since") ?: 0L; val arr = JSArray()
        dao.changedSince(since).forEach { arr.put(toJs(it.toCore())) }
        call.resolve(JSObject().put("items", arr).put("now", System.currentTimeMillis()))
    }

    @PluginMethod fun openNotificationAccess(call: PluginCall) {
        val i = if (Build.VERSION.SDK_INT >= 30) Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, ComponentName(context, PaymentNotificationListener::class.java).flattenToString())
        else Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { context.startActivity(i) } catch (_: Exception) { context.startActivity(Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
        call.resolve()
    }

    @PluginMethod fun requestRebind(call: PluginCall) {
        val ok = repo.hasNotificationAccess()
        if (ok && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) try { NotificationListenerService.requestRebind(ComponentName(context, PaymentNotificationListener::class.java)) } catch (_: Exception) {}
        call.resolve(JSObject().put("requested", ok))
    }

    @PluginMethod fun checkBiometric(call: PluginCall) {
        val res = BiometricManager.from(context).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
        call.resolve(JSObject().put("available", res == BiometricManager.BIOMETRIC_SUCCESS))
    }

    @PluginMethod fun authenticateBiometric(call: PluginCall) {
        val act = activity ?: return call.reject("No active activity")
        val title = call.getString("title") ?: "Unlock Glass Finance"; val subtitle = call.getString("subtitle") ?: "Verify your identity"
        act.runOnUiThread {
            val prompt = BiometricPrompt(act, ContextCompat.getMainExecutor(context), object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) { call.resolve(JSObject().put("authenticated", true)) }
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) { call.resolve(JSObject().put("authenticated", false).put("error", errString.toString())) }
            })
            prompt.authenticate(BiometricPrompt.PromptInfo.Builder().setTitle(title).setSubtitle(subtitle).setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK).setNegativeButtonText("Use PIN").build())
        }
    }

    @PluginMethod fun exportPdfSummary(call: PluginCall) = bg(call) {
        val title = call.getString("title") ?: "Glass Finance Summary"; val subtitle = call.getString("subtitle") ?: ""
        val lines = call.getArray("lines") ?: JSArray()
        val fileName = (call.getString("fileName") ?: "GlassFinance-Summary.pdf").replace(Regex("[^A-Za-z0-9._-]"), "_")
        val doc = PdfDocument(); val titlePaint = Paint().apply { color = Color.rgb(15, 23, 42); textSize = 18f; isFakeBoldText = true; isAntiAlias = true }
        val bodyPaint = Paint().apply { color = Color.rgb(30, 41, 59); textSize = 11.5f; isAntiAlias = true }
        var pageNum = 1; var page = doc.startPage(PdfDocument.PageInfo.Builder(595, 842, pageNum).create()); var y = 52f
        page.canvas.drawText(title, 44f, y, titlePaint); y += 22f
        if (subtitle.isNotBlank()) { page.canvas.drawText(subtitle, 44f, y, bodyPaint); y += 22f }
        for (i in 0 until lines.length()) {
            if (y > 790f) { doc.finishPage(page); pageNum++; page = doc.startPage(PdfDocument.PageInfo.Builder(595, 842, pageNum).create()); y = 52f }
            page.canvas.drawText(lines.optString(i, "").take(92), 44f, y, bodyPaint); y += 16f
        }
        doc.finishPage(page)
        val outFile = File(context.cacheDir, fileName); FileOutputStream(outFile).use { doc.writeTo(it) }; doc.close()
        val uri = FileProvider.getUriForFile(context, context.packageName + ".fileprovider", outFile)
        val share = Intent(Intent.ACTION_SEND).apply { type = "application/pdf"; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }
        activity?.runOnUiThread { try { context.startActivity(Intent.createChooser(share, "Share PDF summary").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (_: Exception) {} }
        call.resolve(JSObject().put("exported", true).put("fileName", fileName))
    }

    @PluginMethod fun saveState(call: PluginCall) = bg(call) { val json = call.getString("json") ?: return@bg call.reject("json required"); dao.putState(AppStateEntity("ledger", json, System.currentTimeMillis())); call.resolve() }
    @PluginMethod fun loadState(call: PluginCall) = bg(call) { val s = dao.state("ledger"); call.resolve(JSObject().put("json", s?.json).put("updatedAt", s?.updatedAt ?: 0L)) }

    private fun toJs(t: DetectedTx): JSObject = JSObject()
        .put("id", t.id).put("amountPaise", t.amountPaise).put("direction", t.direction.name).put("kind", t.kind.name).put("status", t.status.name)
        .put("counterparty", t.counterparty).put("upiRef", t.upiRef).put("txnId", t.txnId).put("appName", t.appName)
        .put("sources", JSONArray(t.sources.map { it.name })).put("verification", t.verification.name).put("categoryId", t.categoryId)
        .put("occurredAt", t.occurredAt).put("countsInLedger", t.countsInLedger())
}
