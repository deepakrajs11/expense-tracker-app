package com.example.expensetracker

import android.app.AlertDialog
import android.content.Context
import android.view.LayoutInflater
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import java.time.LocalDate
import java.util.concurrent.Executors

class AddIncomeDialog(
    private val ctx: Context,
    private val cookie: String,
    private val onSuccess: () -> Unit
) {
    fun show() {
        val view = LayoutInflater.from(ctx).inflate(R.layout.dialog_add_income, null)

        val etAmount = view.findViewById<EditText>(R.id.etAmount)
        val etPlace  = view.findViewById<EditText>(R.id.etPlace)
        val etSource = view.findViewById<EditText>(R.id.etSource)
        val etDate   = view.findViewById<EditText>(R.id.etDate)

        etDate.setText(LocalDate.now().toString())

        val dialog = AlertDialog.Builder(ctx)
            .setTitle("Add Income")
            .setView(view)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .create()

        dialog.setOnShowListener {
            val btnSave = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            btnSave.setOnClickListener {
                val amount = etAmount.text.toString().trim()
                val place  = etPlace.text.toString().trim()
                val source = etSource.text.toString().trim()
                val date   = etDate.text.toString().trim()

                if (amount.isEmpty()) { etAmount.error = "Required"; return@setOnClickListener }
                if (place.isEmpty())  { etPlace.error  = "Required"; return@setOnClickListener }
                if (source.isEmpty()) { etSource.error = "Required"; return@setOnClickListener }
                if (date.isEmpty())   { etDate.error   = "Required"; return@setOnClickListener }

                btnSave.isEnabled = false

                Executors.newSingleThreadExecutor().execute {
                    try {
                        ApiClient.createIncome(cookie, amount, place, source, date)
                        (ctx as? android.app.Activity)?.runOnUiThread {
                            dialog.dismiss()
                            onSuccess()
                        }
                    } catch (e: Exception) {
                        (ctx as? android.app.Activity)?.runOnUiThread {
                            btnSave.isEnabled = true
                            Toast.makeText(ctx, e.message ?: "Failed to save", Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }
        }

        dialog.show()
    }
}
