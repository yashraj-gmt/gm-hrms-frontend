// src/utils/permissions.js
import { ROLES }  from '@/constants/roles'
import { ROUTES } from '@/constants/routes'


export const ROUTE_PERMISSIONS = {
  // ── Core ──────────────────────────────────────────────────────────────────
  [ROUTES.DASHBOARD]: [ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE, ROLES.INTERN, ROLES.TRAINEE],
  [ROUTES.PROFILE]:   [ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE, ROLES.INTERN, ROLES.TRAINEE],

  // ── Employee Module ────────────────────────────────────────────────────────
  [ROUTES.EMPLOYEE]:             [ROLES.ADMIN, ROLES.HR],
  [ROUTES.EMPLOYEE_ADD]:         [ROLES.ADMIN, ROLES.HR],
  [ROUTES.EMPLOYEE_ADD_INTERN]:  [ROLES.ADMIN, ROLES.HR],
  [ROUTES.EMPLOYEE_ADD_TRAINEE]: [ROLES.ADMIN, ROLES.HR],
  [ROUTES.EMPLOYEE_EDIT]:        [ROLES.ADMIN, ROLES.HR],

  // ── Attendance ─────────────────────────────────────────────────────────────
  [ROUTES.ATTENDANCE]:                  [ROLES.ADMIN, ROLES.HR],
  [ROUTES.ATTENDANCE_PENDING]:          [ROLES.ADMIN, ROLES.HR],
  [ROUTES.ATTENDANCE_EMPLOYEE]:         [ROLES.EMPLOYEE, ROLES.INTERN, ROLES.TRAINEE],
  [ROUTES.ATTENDANCE_EMPLOYEE_HISTORY]: [ROLES.EMPLOYEE, ROLES.INTERN, ROLES.TRAINEE],
  [ROUTES.ATTENDANCE_CORRECTION_REQUEST]: [ROLES.EMPLOYEE, ROLES.INTERN, ROLES.TRAINEE],


  // ── Shift ──────────────────────────────────────────────────────────────────
  [ROUTES.SHIFT]:              [ROLES.ADMIN, ROLES.HR],
  [ROUTES.SHIFT_NEW]:          [ROLES.ADMIN, ROLES.HR],
  [ROUTES.SHIFT_EDIT]:         [ROLES.ADMIN, ROLES.HR],
  [ROUTES.SHIFT_VIEW]:         [ROLES.ADMIN, ROLES.HR],
  [ROUTES.SHIFT_CUSTOM]:       [ROLES.ADMIN, ROLES.HR],
  [ROUTES.SHIFT_ASSIGN]:       [ROLES.ADMIN, ROLES.HR],
  [ROUTES.SHIFT_EMPLOYEE]:         [ROLES.EMPLOYEE, ROLES.INTERN, ROLES.TRAINEE],
  [ROUTES.SHIFT_EMPLOYEE_HISTORY]: [ROLES.EMPLOYEE, ROLES.INTERN, ROLES.TRAINEE],

  // ── Leave ──────────────────────────────────────────────────────────────────
  [ROUTES.LEAVE]:          [ROLES.ADMIN, ROLES.HR],
  [ROUTES.LEAVE_EMPLOYEE]: [ROLES.EMPLOYEE, ROLES.INTERN, ROLES.TRAINEE],

  // ── Roles & Permissions ────────────────────────────────────────────────────
  [ROUTES.ROLES]: [ROLES.ADMIN],

  // ── Project & Timesheet ────────────────────────────────────────────────────
  [ROUTES.PROJECTS]:  [ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE],
  [ROUTES.TIMESHEET]: [ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE, ROLES.INTERN, ROLES.TRAINEE],

  // ── Reports & Payroll ──────────────────────────────────────────────────────
  [ROUTES.REPORTS]: [ROLES.ADMIN, ROLES.HR],
  [ROUTES.PAYROLL]: [ROLES.ADMIN, ROLES.HR],

  // ── Master Data ────────────────────────────────────────────────────────────
  [ROUTES.DESIGNATION]:   [ROLES.ADMIN, ROLES.HR],
  [ROUTES.DEPARTMENT]:    [ROLES.ADMIN, ROLES.HR],
  [ROUTES.BRANCH]:        [ROLES.ADMIN, ROLES.HR],
  [ROUTES.DOCUMENTS]:     [ROLES.ADMIN, ROLES.HR],
  [ROUTES.INTERN_COURSE]: [ROLES.ADMIN, ROLES.HR],
  [ROUTES.BREAK_POLICY]:  [ROLES.ADMIN, ROLES.HR],
  [ROUTES.HOLIDAY]:       [ROLES.ADMIN, ROLES.HR],
}

/**
 * Returns true if the given role can access the given route.
 * Pass `null` role to bypass checks (dev mode / auth disabled).
 */
export const hasRouteAccess = (role, route) => {
  if (!role) return true                     // dev bypass
  const allowed = ROUTE_PERMISSIONS[route]
  if (!allowed) return false
  return allowed.includes(role)
}

export const getSidebarItems = (role) =>
  Object.entries(ROUTE_PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([route]) => route)