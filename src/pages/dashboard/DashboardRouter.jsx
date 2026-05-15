import { useAuthStore } from '@/store/authStore'
import { ROLES } from '@/constants/roles'

import AdminDashboard from './AdminDashboard'
import HRDashboard from './HRDashboard'
import EmployeeDashboard from './EmployeeDashboard'

export default function DashboardRouter() {
  const { user } = useAuthStore()
  const role = user?.role

  if (role === ROLES.ADMIN) return <AdminDashboard />
  if (role === ROLES.HR) return <HRDashboard />

  // Employee, Intern, Trainee
  return <EmployeeDashboard />
}