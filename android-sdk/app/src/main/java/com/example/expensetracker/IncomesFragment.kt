package com.example.expensetracker

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.floatingactionbutton.FloatingActionButton
import java.util.concurrent.Executors

class IncomesFragment : Fragment() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var fab: FloatingActionButton
    private val adapter = IncomeAdapter(emptyList())

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? = inflater.inflate(R.layout.fragment_incomes, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        recyclerView = view.findViewById(R.id.recyclerView)
        swipeRefresh = view.findViewById(R.id.swipeRefresh)
        fab          = view.findViewById(R.id.fab)

        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = adapter

        swipeRefresh.setOnRefreshListener { loadIncomes() }
        fab.setOnClickListener { showAddIncomeDialog() }

        loadIncomes()
    }

    private fun loadIncomes() {
        val cookie = SessionManager.getCookie(requireContext()) ?: return
        swipeRefresh.isRefreshing = true

        Executors.newSingleThreadExecutor().execute {
            try {
                val incomes = ApiClient.getIncomes(cookie)
                requireActivity().runOnUiThread {
                    adapter.updateItems(incomes)
                    swipeRefresh.isRefreshing = false
                }
            } catch (e: Exception) {
                requireActivity().runOnUiThread {
                    swipeRefresh.isRefreshing = false
                    Toast.makeText(requireContext(), "Could not load incomes", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun showAddIncomeDialog() {
        val cookie = SessionManager.getCookie(requireContext()) ?: return
        AddIncomeDialog(requireContext(), cookie) { loadIncomes() }.show()
    }
}
