package com.example.expensetracker

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class SmsRuleAdapter(
    private var items: List<SmsMappingRule>,
    private val onDelete: (SmsMappingRule) -> Unit
) : RecyclerView.Adapter<SmsRuleAdapter.VH>() {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvPattern: TextView = view.findViewById(R.id.tvPattern)
        val tvPlace: TextView = view.findViewById(R.id.tvPlace)
        val btnDelete: ImageButton = view.findViewById(R.id.btnDelete)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_sms_rule, parent, false))

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = items[position]
        holder.tvPattern.text = item.senderSlug
        holder.tvPlace.text = item.place
        holder.btnDelete.setOnClickListener { onDelete(item) }
    }

    fun update(newItems: List<SmsMappingRule>) {
        items = newItems
        notifyDataSetChanged()
    }
}