// src/hooks/usePermissions.js
import { useAuthStore } from '@/store/authStore'
import { hasRouteAccess } from '@/utils/permissions'

export function usePermissions() {
  const { user } = useAuthStore()

  return {
    canAccess: (route) => hasRouteAccess(user?.role, route),
    role: user?.role,
  }
}