// src/routes/RoleRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { hasRouteAccess } from '@/utils/permissions'
import { ROUTES } from '@/constants/routes'

export default function RoleRoute({ children, route }) {
  const { user } = useAuthStore()

  if (!hasRouteAccess(user?.role, route)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />
  }

  return children
}