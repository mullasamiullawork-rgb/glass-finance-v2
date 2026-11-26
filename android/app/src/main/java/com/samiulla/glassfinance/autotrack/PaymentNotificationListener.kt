package com.samiulla.glassfinance.autotrack

import android.app.Notification
import android.content.ComponentName
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.samiulla.glassfinance.autotrack.core.PaymentAppRegistry
import com.samiulla.glassfinance.autotrack.core.RawNotification

class PaymentNotificationListener : NotificationListenerService() {
    private val repo by lazy { AutoTrackRepository.get(this) }
    override fun onListenerConnected() { repo.markListenerEvent("listenerConnectedAt"); repo.prefs.edit().putBoolean("listenerConnected", true).apply() }
    override fun onListenerDisconnected() {
        repo.markListenerEvent("listenerDisconnectedAt"); repo.prefs.edit().putBoolean("listenerConnected", false).apply()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) try { requestRebind(ComponentName(this, PaymentNotificationListener::class.java)) } catch (_: Exception) {}
    }
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return; val pkg = sbn.packageName ?: return; if (!PaymentAppRegistry.isSupported(pkg)) return
        val n = sbn.notification ?: return; if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return; val ex = n.extras ?: return
        val textLines = ex.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.mapNotNull { it?.toString()?.trim() }?.filter { it.isNotEmpty() }?.joinToString("\n")?.takeIf { it.isNotEmpty() }
        val raw = RawNotification(pkg, ex.getCharSequence(Notification.EXTRA_TITLE)?.toString(), ex.getCharSequence(Notification.EXTRA_TEXT)?.toString(), ex.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.takeIf { it.isNotBlank() } ?: textLines, ex.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString(), sbn.postTime)
        if (raw.body.isBlank()) return
        repo.handle(raw, sbn.key ?: (pkg + sbn.id))
    }
}
