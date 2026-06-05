package com.example.expensetracker

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import java.util.concurrent.Executors

class OverviewFragment : Fragment() {

    private lateinit var tvNetBalance: TextView
    private lateinit var tvTotalIncome: TextView
    private lateinit var tvTotalExpenses: TextView
    private lateinit var tvGreeting: TextView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? = inflater.inflate(R.layout.fragment_overview, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        tvGreeting      = view.findViewById(R.id.tvGreeting)
        tvNetBalance    = view.findViewById(R.id.tvNetBalance)
        tvTotalIncome   = view.findViewById(R.id.tvTotalIncome)
        tvTotalExpenses = view.findViewById(R.id.tvTotalExpenses)

        val name = SessionManager.getUserName(requireContext())
        tvGreeting.text = if (name.isNotEmpty()) "Hello, $name 👋" else "Hello 👋"

        loadSummary()
    }

    private fun loadSummary() {
        val cookie = SessionManager.getCookie(requireContext()) ?: return

        Executors.newSingleThreadExecutor().execute {
            try {
                val expenses = ApiClient.getExpenses(cookie)
                val incomes  = ApiClient.getIncomes(cookie)

                val totalExpensePaise = expenses.sumOf { it.amountPaise }
                val totalIncomePaise  = incomes.sumOf { it.amountPaise }
                val netPaise          = totalIncomePaise - totalExpensePaise

                requireActivity().runOnUiThread {
                    tvTotalIncome.text   = formatInr(totalIncomePaise)
                    tvTotalExpenses.text = formatInr(totalExpensePaise)
                    tvNetBalance.text    = formatInr(netPaise)
                    tvNetBalance.setTextColor(
                        if (netPaise >= 0)
                            resources.getColor(R.color.green, null)
                        else
                            resources.getColor(R.color.red, null)
                    )
                }
            } catch (e: Exception) {
                requireActivity().runOnUiThread {
                    Toast.makeText(requireContext(), "Could not load summary", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun formatInr(paise: Long): String {
        val rupees = paise / 100.0
        return "₹%.2f".format(rupees)
    }
}
