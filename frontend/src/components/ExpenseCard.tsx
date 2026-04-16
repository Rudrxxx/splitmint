"use client"

import { useState } from "react"
import { Trash2, Pencil, ChevronDown } from "lucide-react"
import api from "@/lib/api"
import { Expense, Participant } from "@/lib/types"
import AddExpenseModal from "./AddExpenseModal"

interface Props {
  expense: Expense
  participants: Participant[]
  groupId: string
  onDeleted: () => void
  onEdited: () => void
}

export default function ExpenseCard({ expense, participants, groupId, onDeleted, onEdited }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const payer = participants.find((p) => p.id === expense.payer_id)

  async function handleDelete() {
    if (!confirm("Delete this expense?")) return
    setDeleting(true)
    try {
      await api.delete(`/groups/${groupId}/expenses/${expense.id}`)
      onDeleted()
    } finally {
      setDeleting(false)
    }
  }

  const modeLabel: Record<string, string> = { equal: "Equal", custom: "Custom", percentage: "%" }

  return (
    <>
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 text-white"
              style={{ backgroundColor: payer?.color || "#6366f1" }}
            >
              {payer?.avatar_initial || "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{expense.description}</p>
              <p className="text-xs text-zinc-400">
                {payer?.name} · {new Date(expense.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <span className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">{modeLabel[expense.split_mode]}</span>
            <span className="text-sm font-semibold text-zinc-900">₹{Number(expense.amount).toFixed(2)}</span>
            <button onClick={() => setEditing(true)} className="text-zinc-300 hover:text-zinc-600 transition ml-1">
              <Pencil size={13} />
            </button>
            <button onClick={handleDelete} disabled={deleting} className="text-zinc-300 hover:text-red-400 transition">
              <Trash2 size={13} />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="text-zinc-300 hover:text-zinc-600 transition">
              <ChevronDown size={15} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
        {expanded && expense.splits.length > 0 && (
          <div className="border-t border-zinc-100 px-4 py-3 flex flex-col gap-1.5">
            {expense.splits.map((s) => {
              const p = participants.find((pt) => pt.id === s.participant_id)
              return (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{p?.name || "Unknown"}</span>
                  <span className="text-xs font-medium text-zinc-700">₹{Number(s.share_amount).toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editing && (
        <AddExpenseModal
          groupId={groupId}
          participants={participants}
          editExpense={expense}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onEdited() }}
        />
      )}
    </>
  )
}