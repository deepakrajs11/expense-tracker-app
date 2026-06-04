package com.example.smssdk

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }

        val title = TextView(this).apply {
            text = "SMS SDK"
            textSize = 24f
        }

        val subtitle = TextView(this).apply {
            text = "This app listens for incoming SMS and shows mapping notifications."
            textSize = 16f
        }

        val openMapping = Button(this).apply {
            text = "Open mapping screen"
            setOnClickListener {
                startActivity(Intent(this@MainActivity, MappingActivity::class.java))
            }
        }

        layout.addView(title)
        layout.addView(subtitle)
        layout.addView(openMapping)

        setContentView(layout)
    }
}
