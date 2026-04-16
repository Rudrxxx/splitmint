"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Sparkles } from "lucide-react"
import api from "@/lib/api"
import { Group, Participant, Expense, GroupSummary, Settlement } from "@/lib/types"
import ExpenseCard from "@/components/ExpenseCard"
import AddExpenseModal from "@/components/AddExpenseModal"
import SummarySection from "@/components/SummarySection"
import MintSensePanel from "@/components/MintSensePanel"

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [group, setGroup] = useState<Group | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<GroupSummary | null>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showMintSense, setShowMintSense] = useState(false)
  const [search, setSearch] = useState("")

  const fetchAll = useCallback(async () => {
    try {
      const [gRes, pRes, eRes, sRes, settRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/participants`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/summary`),
        api.get(`/groups/${id}/settlements`),
      ])
      setGroup(gRes.data)
      setParticipants(pRes.data)
      setExpenses(eRes.data)
      setSummary(sRes.data)
      setSettlements(settRes.data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = expenses.filter((e) =>
    e.description.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-8 bg-zinc-100 rounded-lg w-40" />
        <div className="h-32 bg-zinc-100 rounded-2xl" />
        <div className="h-48 bg-zinc-100 rounded-2xl" />
      </div>
    )
  }

  if (!group) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-zinc-400 hover:text-zinc-700 transition">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-xl font-semibold text-zinc-900">{group.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMintSense(true)}
            className="flex items-center gap-1.5 h-9 px-3 text-sm border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition"
          >
            <Sparkles size={14} />
            MintSense
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 h-9 px-3 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition"
          >
            <Plus size={14} />
            Add expense
          </button>
        </div>
      </div>

      {summary && <SummarySection summary={summary} settlements={settlements} participants={participants} />}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-700">Expenses</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-8 w-44 rounded-lg border border-zinc-200 px-3 text-xs outline-none focus:border-zinc-400 transition"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center">
            <p className="text-sm text-zinc-400">No expenses yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((exp) => (
              <ExpenseCard
                key={exp.id}
                expense={exp}
                participants={participants}
                onDeleted={fetchAll}
                onEdited={fetchAll}
                groupId={id}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddExpenseModal
          groupId={id}
          participants={participants}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchAll() }}
        />
      )}

      {showMintSense && (
        <MintSensePanel
          groupId={id}
          participants={participants}
          onClose={() => setShowMintSense(false)}
          onExpenseAdded={() => { setShowMintSense(false); fetchAll() }}
        />
      )}
    </div>
  )
}