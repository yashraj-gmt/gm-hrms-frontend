// src/routes/PublicRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/constants/routes'

/**
 * Wraps auth pages (login, forgot-password, etc.)
 * Redirects already-authenticated users straight to the dashboard.
 */
export default function PublicRoute({ children }) {
  const { token, user } = useAuthStore()

  if (token && user) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return children
}