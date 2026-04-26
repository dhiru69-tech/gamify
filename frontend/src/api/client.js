import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL

if (!BASE_URL) {
  console.error('VITE_API_URL is not set. Add it to your Vercel environment variables.')
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // Supabase is always-on — 15s is enough
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('g_access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('g_refresh')
        if (!refresh) throw new Error('no refresh token')
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          { refresh_token: refresh },
          { timeout: 15000 }
        )
        localStorage.setItem('g_access', data.access_token)
        localStorage.setItem('g_refresh', data.refresh_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        localStorage.removeItem('g_access')
        localStorage.removeItem('g_refresh')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
