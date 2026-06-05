package com.example.smssdk

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class ScannerActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val layout = LinearLayout(this)
        layout.orientation = LinearLayout.VERTICAL
        val tv = TextView(this)
        tv.text = "Scan or enter code"
        val scanBtn = Button(this)
        scanBtn.text = "Launch external scanner"
        scanBtn.setOnClickListener {
            // Try to launch ZXing scanner if available
            val scanIntent = Intent("com.google.zxing.client.android.SCAN")
            try {
                startActivityForResult(scanIntent, 1)
            } catch (e: Exception) {
                AlertDialog.Builder(this)
                    .setMessage("No external scanner app found. Please install a scanner or enter code manually.")
                    .setPositiveButton("OK", null)
                    .show()
            }
        }

        val codeInput = EditText(this)
        codeInput.hint = "Enter temporary code"

        val submit = Button(this)
        submit.text = "Submit code"
        submit.setOnClickListener {
            val code = codeInput.text.toString()
            val res = Intent()
            res.putExtra("scanned_code", code)
            setResult(Activity.RESULT_OK, res)
            finish()
        }

        layout.addView(tv)
        layout.addView(scanBtn)
        layout.addView(codeInput)
        layout.addView(submit)
        setContentView(layout)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1 && resultCode == Activity.RESULT_OK) {
            val contents = data?.getStringExtra("SCAN_RESULT") ?: data?.getStringExtra("scanned_code")
            val res = Intent()
            res.putExtra("scanned_code", contents)
            setResult(Activity.RESULT_OK, res)
            finish()
        }
    }
}
