package com.example.expensetracker

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.content.Intent
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment

class ProfileFragment : Fragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? = inflater.inflate(R.layout.fragment_profile, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val tvName  = view.findViewById<TextView>(R.id.tvName)
        val tvEmail = view.findViewById<TextView>(R.id.tvEmail)
        val btnLogout = view.findViewById<Button>(R.id.btnLogout)
        val btnSmsAutomation = view.findViewById<Button>(R.id.btnSmsAutomation)

        tvName.text  = SessionManager.getUserName(requireContext())
        tvEmail.text = SessionManager.getUserEmail(requireContext())

        btnLogout.setOnClickListener {
            (requireActivity() as DashboardActivity).logout()
        }

        btnSmsAutomation.setOnClickListener {
            startActivity(Intent(requireContext(), SmsAutomationActivity::class.java))
        }
    }
}
