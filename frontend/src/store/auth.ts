import { create } from "zustand"
import { persist } from "zustand/middleware"
import { User } from "@/lib/types"

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (token, user) => {
        localStorage.setItem("sm_token", token)
        set({ token, user, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem("sm_token")
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: "sm_user",
    }
  )
)