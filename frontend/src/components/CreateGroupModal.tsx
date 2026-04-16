"use client"

import { useState } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import api from "@/lib/api"

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function CreateGroupModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("")
  const [participants, setParticipants] = useState([{ name: "", color: COLORS[0] }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function addParticipant() {
    if (participants.length >= 3) return
    setParticipants([...participants, { name: "", color: COLORS[participants.length] }])
  }

  function removeParticipant(i: number) {
    setParticipants(participants.filter((_, idx) => idx !== i))
  }

  function updateParticipant(i: number, field: string, value: string) {
    setParticipants(participants.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) { setError("Group name is required."); return }
    const validParticipants = participants.filter((p) => p.name.trim())
    setLoading(true)
    try {
      const groupRes = await api.post("/groups", { name: name.trim() })
      const groupId = groupRes.data.id
      for (const p of validParticipants) {
        await api.post(`/groups/${groupId}/participants`, {
          name: p.name.trim(),
          color: p.color,
          avatar_initial: p.name.trim()[0]?.toUpperCase(),
        })
      }
      onCreated()
    } catch {
      setError("Failed to create group.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl border border-zinc-200 w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">New group</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">Group name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400 transition"
              placeholder="e.g. Goa trip"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-700">Participants</label>
              {participants.length < 3 && (
                <button type="button" onClick={addParticipant} className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition">
                  <Plus size={13} /> Add
                </button>
              )}
            </div>
            {participants.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  value={p.color}
                  onChange={(e) => updateParticipant(i, "color", e.target.value)}
                  className="w-8 h-8 rounded-lg border border-zinc-200 cursor-pointer p-0.5"
                />
                <input
                  value={p.name}
                  onChange={(e) => updateParticipant(i, "name", e.target.value)}
                  className="flex-1 h-9 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400 transition"
                  placeholder={`Participant ${i + 1}`}
                />
                <button type="button" onClick={() => removeParticipant(i)} className="text-zinc-300 hover:text-red-400 transition">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-50">
              {loading ? "Creating..." : "Create group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}