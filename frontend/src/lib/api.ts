import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sm_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("sm_token")
      localStorage.removeItem("sm_user")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export default api