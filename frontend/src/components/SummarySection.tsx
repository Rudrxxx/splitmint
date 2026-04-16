"use client"

import { GroupSummary, Settlement, Participant } from "@/lib/types"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { ArrowRight } from "lucide-react"

interface Props {
  summary: GroupSummary
  settlements: Settlement[]
  participants: Participant[]
}

export default function SummarySection({ summary, settlements, participants }: Props) {
  const chartData = summary.participants.map((p) => ({
    name: p.name.split(" ")[0],
    Paid: parseFloat(p.total_paid),
    Share: parseFloat(p.total_share),
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard label="Total spent" value={`₹${Number(summary.total_spent).toFixed(0)}`} />
        <MetricCard label="Expenses" value={String(summary.expense_count)} />
        <MetricCard label="Participants" value={String(summary.participant_count)} />
      </div>

      {summary.participants.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500 mb-4">Paid vs share</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} barSize={16} barGap={4}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7", boxShadow: "none" }}
                formatter={(v: number) => [`₹${v.toFixed(2)}`]}
              />
              <Bar dataKey="Paid" fill="#18181b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Share" fill="#d4d4d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-zinc-900" /><span className="text-xs text-zinc-400">Paid</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-zinc-300" /><span className="text-xs text-zinc-400">Share</span></div>
          </div>
        </div>
      )}

      {settlements.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500 mb-3">Settle up</p>
          <div className="flex flex-col gap-2">
            {settlements.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                <div className="flex items-center gap-2">
                  <Avatar name={s.from_name} participants={participants} />
                  <span className="text-sm text-zinc-700">{s.from_name}</span>
                  <ArrowRight size={14} className="text-zinc-300" />
                  <Avatar name={s.to_name} participants={participants} />
                  <span className="text-sm text-zinc-700">{s.to_name}</span>
                </div>
                <span className="text-sm font-semibold text-zinc-900">₹{Number(s.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.participants.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500 mb-3">Balances</p>
          <div className="flex flex-col gap-2">
            {summary.participants.map((p) => {
              const net = parseFloat(p.net)
              return (
                <div key={p.participant_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: p.color || "#6366f1" }}>
                      {p.avatar_initial}
                    </div>
                    <span className="text-sm text-zinc-700">{p.name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${net > 0 ? "text-green-600" : net < 0 ? "text-red-500" : "text-zinc-400"}`}>
                    {net > 0 ? `+₹${net.toFixed(2)}` : net < 0 ? `-₹${Math.abs(net).toFixed(2)}` : "settled"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className="text-xl font-semibold text-zinc-900">{value}</p>
    </div>
  )
}

function Avatar({ name, participants }: { name: string; participants: Participant[] }) {
  const p = participants.find((pt) => pt.name === name)
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
      style={{ backgroundColor: p?.color || "#6366f1" }}>
      {p?.avatar_initial || name[0]?.toUpperCase()}
    </div>
  )
}