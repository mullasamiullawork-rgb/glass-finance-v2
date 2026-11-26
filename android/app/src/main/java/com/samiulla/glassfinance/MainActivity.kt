package com.samiulla.glassfinance

import android.content.ComponentName
import android.os.Build
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.view.WindowManager
import com.getcapacitor.BridgeActivity
import com.samiulla.glassfinance.autotrack.AutoTrackPlugin
import com.samiulla.glassfinance.autotrack.AutoTrackRepository
import com.samiulla.glassfinance.autotrack.PaymentNotificationListener

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(AutoTrackPlugin::class.java)
        super.onCreate(savedInstanceState)
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    }

    override fun onResume() {
        super.onResume()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && AutoTrackRepository.get(this).hasNotificationAccess()) {
            try { NotificationListenerService.requestRebind(ComponentName(this, PaymentNotificationListener::class.java)) } catch (_: Exception) {}
        }
    }
}
