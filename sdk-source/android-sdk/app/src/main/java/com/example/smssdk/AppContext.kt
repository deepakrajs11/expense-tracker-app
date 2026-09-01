package com.example.smssdk

import android.app.Application

class AppContext : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
        NotificationHelper.ensureChannel(this)
    }

    companion object {
        lateinit var instance: AppContext
            private set
    }
}
