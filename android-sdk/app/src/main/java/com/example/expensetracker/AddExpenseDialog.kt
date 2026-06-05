package com.example.expensetracker

import android.app.AlertDialog
import android.content.Context
import android.view.LayoutInflater
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.Toast
import java.time.LocalDate
import java.util.concurrent.Executors

private val CATEGORIES = arrayOf(
    "Groceries", "Food", "Transport", "Rent", "Utilities",
    "Shopping", "Health", "Entertainment", "Travel", "Bills", "Other"
)

class AddExpenseDialog(
    private val ctx: Context,
    private val cookie: String,
    private val onSuccess: () -> Unit
) {
    fun show() {
        val view = LayoutInflater.from(ctx).inflate(R.layout.dialog_add_expense, null)

        val etAmount      = view.findViewById<EditText>(R.id.etAmount)
        val spinnerCat    = view.findViewById<Spinner>(R.id.spinnerCategory)
        val etDescription = view.findViewById<EditText>(R.id.etDescription)
        val etPlace       = view.findViewById<EditText>(R.id.etPlace)
        val etDate        = view.findViewById<EditText>(R.id.etDate)

        spinnerCat.adapter = ArrayAdapter(ctx, android.R.layout.simple_spinner_dropdown_item, CATEGORIES)
        etDate.setText(LocalDate.now().toString())

        val dialog = AlertDialog.Builder(ctx)
            .setTitle("Add Expense")
            .setView(view)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .create()

        dialog.setOnShowListener {
            val btnSave = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            btnSave.setOnClickListener {
                val amount      = etAmount.text.toString().trim()
                val category    = spinnerCat.selectedItem?.toString() ?: ""
                val description = etDescription.text.toString().trim()
                val place       = etPlace.text.toString().trim()
                val date        = etDate.text.toString().trim()

                if (amount.isEmpty()) { etAmount.error = "Required"; return@setOnClickListener }
                if (date.isEmpty())   { etDate.error   = "Required"; return@setOnClickListener }

                btnSave.isEnabled = false

                Executors.newSingleThreadExecutor().execute {
                    try {
                        ApiClient.createExpense(cookie, amount, category, description, place, date)
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
