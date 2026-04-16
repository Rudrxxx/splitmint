"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/store/auth"
import { LogOut } from "lucide-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, user, logout } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login")
  }, [isAuthenticated, router])

  function handleLogout() {
    logout()
    router.push("/login")
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7f4]">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-base font-semibold text-zinc-900 tracking-tight">
            SplitMint
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 hidden sm:block">{user?.full_name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition"
            >
              <LogOut size={15} />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  )
}