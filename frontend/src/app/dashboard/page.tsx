"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Users, Coins } from "lucide-react"
import api from "@/lib/api"
import { Group } from "@/lib/types"
import CreateGroupModal from "@/components/CreateGroupModal"

export default function DashboardPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function fetchGroups() {
    try {
      const res = await api.get("/groups")
      setGroups(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGroups() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Your groups</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{groups.length} group{groups.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-9 px-4 bg-zinc-900 text-white text-sm rounded-lg hover:bg-zinc-700 transition"
        >
          <Plus size={15} />
          New group
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-200 p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
            <Users size={20} className="text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-900">No groups yet</p>
          <p className="text-sm text-zinc-500 mt-1">Create one to start splitting expenses</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => router.push(`/dashboard/groups/${g.id}`)}
              className="bg-white rounded-2xl border border-zinc-200 p-5 text-left hover:border-zinc-300 hover:shadow-sm transition group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">
                  <Coins size={16} className="text-zinc-500" />
                </div>
              </div>
              <p className="font-medium text-zinc-900 text-sm">{g.name}</p>
              <p className="text-xs text-zinc-400 mt-1">
                {new Date(g.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchGroups() }}
        />
      )}
    </div>
  )
}