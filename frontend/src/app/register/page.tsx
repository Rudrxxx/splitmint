"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth"

export default function RegisterPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setLoading(true)
    try {
      const tokenRes = await api.post("/auth/register", {
        email,
        password,
        full_name: fullName,
      })
      const { access_token } = tokenRes.data
      const userRes = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      login(access_token, userRes.data)
      router.push("/dashboard")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || "Registration failed. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">SplitMint</h1>
          <p className="text-sm text-zinc-500 mt-1">Create your account</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-10 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition"
                placeholder="Rahul Sharma"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition"
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition"
                placeholder="min 8 characters"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-10 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-zinc-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}