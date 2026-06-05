package com.example.expensetracker

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class IncomeAdapter(private var items: List<ApiClient.Income>) :
    RecyclerView.Adapter<IncomeAdapter.VH>() {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvAmount: TextView = view.findViewById(R.id.tvAmount)
        val tvSource: TextView = view.findViewById(R.id.tvSource)
        val tvPlace: TextView  = view.findViewById(R.id.tvPlace)
        val tvDate: TextView   = view.findViewById(R.id.tvDate)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_income, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val inc = items[position]
        holder.tvAmount.text = "₹%.2f".format(inc.amountPaise / 100.0)
        holder.tvSource.text = inc.source.ifEmpty { "—" }
        holder.tvPlace.text  = inc.place.ifEmpty { "—" }
        holder.tvDate.text   = inc.date
    }

    fun updateItems(newItems: List<ApiClient.Income>) {
        items = newItems
        notifyDataSetChanged()
    }
}
