"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import api from "@/lib/api"
import { Expense, Participant, SplitMode } from "@/lib/types"

interface SplitEntry { participant_id: string; share: string }

interface Props {
  groupId: string
  participants: Participant[]
  editExpense?: Expense
  onClose: () => void
  onSaved: () => void
}

export default function AddExpenseModal({ groupId, participants, editExpense, onClose, onSaved }: Props) {
  const [description, setDescription] = useState(editExpense?.description || "")
  const [amount, setAmount] = useState(editExpense?.amount || "")
  const [date, setDate] = useState(editExpense ? editExpense.date.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [payerId, setPayerId] = useState(editExpense?.payer_id || participants[0]?.id || "")
  const [splitMode, setSplitMode] = useState<SplitMode>(editExpense?.split_mode || "equal")
  const [splits, setSplits] = useState<SplitEntry[]>(() =>
    participants.map((p) => ({ participant_id: p.id, share: "" }))
  )
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editExpense?.splits.length) {
      setSplits(
        participants.map((p) => {
          const existing = editExpense.splits.find((s) => s.participant_id === p.id)
          return { participant_id: p.id, share: existing ? existing.share_amount : "" }
        })
      )
    }
  }, [editExpense, participants])

  const totalAmount = Number(amount) || 0

  function getEqualShare(i: number): string {
    if (!totalAmount || !participants.length) return "0.00"
    const base = Math.floor((totalAmount / participants.length) * 100) / 100
    const remainder = Number((totalAmount - base * participants.length).toFixed(2))
    return i === 0 ? (base + remainder).toFixed(2) : base.toFixed(2)
  }

  function buildPayload() {
    const splitsPayload = splitMode === "equal"
      ? participants.map((p, i) => ({ participant_id: p.id, share_amount: parseFloat(getEqualShare(i)) }))
      : splits.filter((s) => s.share !== "").map((s) => ({ participant_id: s.participant_id, share_amount: parseFloat(s.share) }))

    return {
      description,
      amount: parseFloat(String(amount)),
      date: new Date(date).toISOString(),
      payer_id: payerId,
      split_mode: splitMode,
      splits: splitsPayload,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!description.trim()) { setError("Description is required."); return }
    if (!totalAmount || totalAmount <= 0) { setError("Amount must be greater than 0."); return }
    setLoading(true)
    try {
      if (editExpense) {
        await api.patch(`/groups/${groupId}/expenses/${editExpense.id}`, buildPayload())
      } else {
        await api.post(`/groups/${groupId}/expenses`, buildPayload())
      }
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || "Failed to save expense.")
    } finally {
      setLoading(false)
    }
  }

  const modeTabs: { label: string; value: SplitMode }[] = [
    { label: "Equal", value: "equal" },
    { label: "Custom", value: "custom" },
    { label: "Percentage", value: "percentage" },
  ]

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl border border-zinc-200 w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-zinc-900">{editExpense ? "Edit expense" : "Add expense"}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="h-10 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400 transition"
              placeholder="Dinner at Pizza Hut" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Amount (₹)</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="h-10 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400 transition"
                placeholder="0.00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="h-10 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400 transition" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">Paid by</label>
            <select value={payerId} onChange={(e) => setPayerId(e.target.value)}
              className="h-10 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400 transition bg-white">
              {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-700">Split</label>
            <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
              {modeTabs.map((t) => (
                <button key={t.value} type="button" onClick={() => setSplitMode(t.value)}
                  className={`flex-1 h-8 text-xs font-medium transition ${splitMode === t.value ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {splitMode === "equal" && (
              <div className="flex flex-col gap-1.5">
                {participants.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between py-1">
                    <span className="text-sm text-zinc-600">{p.name}</span>
                    <span className="text-sm font-medium text-zinc-900">₹{getEqualShare(i)}</span>
                  </div>
                ))}
              </div>
            )}

            {(splitMode === "custom" || splitMode === "percentage") && (
              <div className="flex flex-col gap-2">
                {participants.map((p, i) => {
                  const s = splits.find((s) => s.participant_id === p.id)
                  const total = splits.reduce((acc, s) => acc + (parseFloat(s.share) || 0), 0)
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-sm text-zinc-600 flex-1">{p.name}</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={s?.share || ""}
                        onChange={(e) => setSplits(splits.map((ss, si) => si === i ? { ...ss, share: e.target.value } : ss))}
                        className="w-24 h-8 rounded-lg border border-zinc-200 px-2 text-sm outline-none focus:border-zinc-400 transition text-right"
                        placeholder="0"
                      />
                      <span className="text-xs text-zinc-400 w-4">{splitMode === "percentage" ? "%" : ""}</span>
                    </div>
                  )
                })}
                <div className="flex justify-between pt-1 border-t border-zinc-100">
                  <span className="text-xs text-zinc-400">Total</span>
                  <span className={`text-xs font-medium ${Math.abs(splits.reduce((a, s) => a + (parseFloat(s.share) || 0), 0) - (splitMode === "percentage" ? 100 : totalAmount)) > 0.01 ? "text-red-500" : "text-green-600"}`}>
                    {splits.reduce((a, s) => a + (parseFloat(s.share) || 0), 0).toFixed(2)} / {splitMode === "percentage" ? "100%" : `₹${totalAmount.toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-50">
              {loading ? "Saving..." : editExpense ? "Update" : "Add expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}