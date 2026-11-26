package com.samiulla.glassfinance

import android.app.Application
import com.samiulla.glassfinance.autotrack.AutoTrackRepository

class GlassFinanceApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AutoTrackRepository.get(this)
    }
}
