package com.example.expensetracker

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class ExpenseAdapter(private var items: List<ApiClient.Expense>) :
    RecyclerView.Adapter<ExpenseAdapter.VH>() {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvAmount: TextView      = view.findViewById(R.id.tvAmount)
        val tvCategory: TextView    = view.findViewById(R.id.tvCategory)
        val tvDescription: TextView = view.findViewById(R.id.tvDescription)
        val tvPlace: TextView       = view.findViewById(R.id.tvPlace)
        val tvDate: TextView        = view.findViewById(R.id.tvDate)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_expense, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val e = items[position]
        holder.tvAmount.text      = "₹%.2f".format(e.amountPaise / 100.0)
        holder.tvCategory.text    = e.category.ifEmpty { "—" }
        holder.tvDescription.text = e.description.ifEmpty { "No description" }
        holder.tvPlace.text       = if (e.place.isNotEmpty()) "From: ${e.place}" else ""
        holder.tvDate.text        = e.date
    }

    fun updateItems(newItems: List<ApiClient.Expense>) {
        items = newItems
        notifyDataSetChanged()
    }
}
