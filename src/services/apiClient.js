// src/services/apiClient.js
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// Request Interceptor — attach JWT access token
apiClient.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor — handle 401 / token refresh
let isRefreshing   = false
let refreshQueue   = []   // pending requests waiting for new token

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  )
  refreshQueue = []
}

apiClient.interceptors.response.use(
  // Unwrap the ApiResponse wrapper so callers get { success, message, data }
  (response) => response.data,

  async (error) => {
    const originalRequest = error.config

    // 401 Unauthorized — attempt silent token refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      const { refreshToken, updateTokens, logout } = useAuthStore.getState()

      if (!refreshToken) {
        logout()
        window.location.href = ROUTES.LOGIN
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing            = true

      try {
    const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
        { refreshToken }
    )

    const responseData = res.data?.data
    
    // 🔍 Add this temporarily to catch field name mismatches
    console.debug('[Token Refresh] Response data keys:', Object.keys(responseData ?? {}))

    const newAccess  = responseData?.token        // verify this matches your LoginResponseDTO field
    const newRefresh = responseData?.refreshToken  // verify this too

    if (!newAccess || !newRefresh) {
        throw new Error(`Refresh response missing token fields. Got: ${JSON.stringify(responseData)}`)
    }

    updateTokens(newAccess, newRefresh)
    apiClient.defaults.headers.common.Authorization = `Bearer ${newAccess}`

    processQueue(null, newAccess)
    originalRequest.headers.Authorization = `Bearer ${newAccess}`
    return apiClient(originalRequest)

} catch (refreshError) {
    console.error('[Token Refresh] Failed:', refreshError)
    processQueue(refreshError, null)
    logout()
    window.location.href = ROUTES.LOGIN
    return Promise.reject(refreshError)
} finally {
    isRefreshing = false
}
    }

    // ── Extract backend error message ─────────────────────────────────────────
    const backendMessage =
      error.response?.data?.message ||
      error.response?.data?.error   ||
      error.message                 ||
      'Something went wrong. Please try again.'

    return Promise.reject({ message: backendMessage, status: error.response?.status })
  }
)

export default apiClient