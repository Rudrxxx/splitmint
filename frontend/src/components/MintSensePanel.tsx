"use client"

import { useState } from "react"
import { X, Sparkles, Send, CheckCircle } from "lucide-react"
import api from "@/lib/api"
import { Participant } from "@/lib/types"
import AddExpenseModal from "./AddExpenseModal"

interface ParsedExpense {
  description: string
  amount: number
  payer_id: string
  payer_name: string
  split_mode: "equal" | "custom" | "percentage"
  participants: { id: string; name: string }[]
  category: string
}

interface Props {
  groupId: string
  participants: Participant[]
  onClose: () => void
  onExpenseAdded: () => void
}

export default function MintSensePanel({ groupId, participants, onClose, onExpenseAdded }: Props) {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedExpense | null>(null)
  const [summary, setSummary] = useState("")
  const [summarizing, setSummarizing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")

  async function handleParse() {
    if (!input.trim()) return
    setLoading(true)
    setError("")
    setParsed(null)
    try {
      const res = await api.post("/ai/parse-expense", { text: input, group_id: groupId })
      setParsed(res.data)
    } catch {
      setError("Could not parse the expense. Try rephrasing.")
    } finally {
      setLoading(false)
    }
  }

  async function handleAddDirectly() {
    if (!parsed) return
    setAdding(true)
    try {
      const splitsPayload = participants.map((p, i) => {
        const base = Math.floor((parsed.amount / participants.length) * 100) / 100
        const remainder = Number((parsed.amount - base * participants.length).toFixed(2))
        return { participant_id: p.id, share_amount: i === 0 ? base + remainder : base }
      })
      await api.post(`/groups/${groupId}/expenses`, {
        description: parsed.description,
        amount: parsed.amount,
        date: new Date().toISOString(),
        payer_id: parsed.payer_id,
        split_mode: "equal",
        splits: splitsPayload,
      })
      onExpenseAdded()
    } catch {
      setError("Failed to add expense.")
    } finally {
      setAdding(false)
    }
  }

  async function handleSummarize() {
    setSummarizing(true)
    setSummary("")
    try {
      const res = await api.post("/ai/summarize", { group_id: groupId })
      setSummary(res.data.summary)
    } catch {
      setError("Could not generate summary.")
    } finally {
      setSummarizing(false)
    }
  }

  const categoryColors: Record<string, string> = {
    food: "bg-orange-100 text-orange-700",
    transport: "bg-blue-100 text-blue-700",
    accommodation: "bg-purple-100 text-purple-700",
    entertainment: "bg-pink-100 text-pink-700",
    utilities: "bg-yellow-100 text-yellow-700",
    other: "bg-zinc-100 text-zinc-600",
  }

  const fakeExpenseForEdit = parsed ? {
    id: "",
    group_id: groupId,
    description: parsed.description,
    amount: String(parsed.amount),
    date: new Date().toISOString(),
    payer_id: parsed.payer_id,
    created_by: "",
    split_mode: parsed.split_mode,
    created_at: new Date().toISOString(),
    splits: [],
  } : null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center sm:justify-end z-50">
        <div className="bg-white w-full sm:w-96 sm:h-full sm:max-h-screen sm:rounded-none rounded-t-2xl border-t sm:border-l border-zinc-200 flex flex-col shadow-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-zinc-500" />
              <span className="font-semibold text-zinc-900 text-sm">MintSense</span>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            <p className="text-xs text-zinc-400">Describe an expense in plain language and I&apos;ll structure it for you.</p>

            {error && <p className="text-xs text-red-500">{error}</p>}

            {parsed && (
              <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-900">{parsed.description}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[parsed.category] || categoryColors.other}`}>
                    {parsed.category}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                  <div><span className="text-zinc-400">Amount</span><br /><span className="font-medium text-zinc-800">₹{parsed.amount}</span></div>
                  <div><span className="text-zinc-400">Paid by</span><br /><span className="font-medium text-zinc-800">{parsed.payer_name}</span></div>
                  <div><span className="text-zinc-400">Split</span><br /><span className="font-medium text-zinc-800">{parsed.split_mode}</span></div>
                  <div><span className="text-zinc-400">People</span><br /><span className="font-medium text-zinc-800">{parsed.participants.map((p) => p.name).join(", ") || "all"}</span></div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditing(true)} className="flex-1 h-8 text-xs rounded-lg border border-zinc-200 text-zinc-600 hover:bg-white transition">
                    Edit first
                  </button>
                  <button onClick={handleAddDirectly} disabled={adding} className="flex-1 h-8 text-xs rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                    <CheckCircle size={13} />
                    {adding ? "Adding..." : "Add expense"}
                  </button>
                </div>
              </div>
            )}

            {summary && (
              <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4">
                <p className="text-xs font-medium text-zinc-500 mb-2">Group summary</p>
                <p className="text-sm text-zinc-700 leading-relaxed">{summary}</p>
              </div>
            )}

            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="h-9 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition disabled:opacity-50"
            >
              {summarizing ? "Summarizing..." : "Summarize group spending"}
            </button>
          </div>

          <div className="px-5 py-4 border-t border-zinc-100">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleParse()}
                placeholder="Rahul paid ₹600 for dinner, split equally..."
                className="flex-1 h-10 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400 transition"
              />
              <button
                onClick={handleParse}
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-700 transition disabled:opacity-50"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {editing && fakeExpenseForEdit && (
        <AddExpenseModal
          groupId={groupId}
          participants={participants}
          editExpense={fakeExpenseForEdit}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onExpenseAdded() }}
        />
      )}
    </>
  )
}