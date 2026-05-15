// src/router/index.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ROUTES } from '@/constants/routes'
import ProtectedRoute from '@/routes/ProtectedRoute'   // ← now uncommented & real
import PublicRoute    from '@/routes/PublicRoute'       // ← new
import RoleRoute      from '@/routes/RoleRoute'
import AppShell       from '@/components/layout/AppShell'

// ── Dashboard ─────────────────────────────────────────────────────────────────
const DashboardRouter = lazy(() => import('@/pages/dashboard/DashboardRouter'))

// ── Auth ──────────────────────────────────────────────────────────────────────
const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const VerifyOTPPage      = lazy(() => import('@/pages/auth/VerifyOTPPage'))
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'))

// ── Employee ──────────────────────────────────────────────────────────────────
const EmployeeList    = lazy(() => import('@/pages/employee/EmployeeList'))
const AddEmployee     = lazy(() => import('@/pages/employee/AddEmployee'))
const AddIntern       = lazy(() => import('@/pages/employee/AddIntern'))
const AddTrainee      = lazy(() => import('@/pages/employee/AddTrainee'))
const EditEmployee = lazy(() => import('@/pages/employee/EditEmployee'))


// ── Attendance ────────────────────────────────────────────────────────────────
const AttendanceOverview        = lazy(() => import('@/pages/attendance/AttendanceOverview'))
const PendingApprovals          = lazy(() => import('@/pages/attendance/PendingApprovals'))
const EmployeeAttendance        = lazy(() => import('@/pages/attendance/EmployeeAttendance'))
const EmployeeAttendanceHistory = lazy(() => import('@/pages/attendance/EmployeeAttendanceHistory'))
const EmployeeAttendanceCorrectionRequest = lazy(() => import('@/pages/attendance/EmployeeAttendanceCorrectionRequest'))

// ── Shift Management ──────────────────────────────────────────────────────────
const ShiftManagement      = lazy(() => import('@/pages/shift/ShiftManagement'))
const ShiftForm            = lazy(() => import('@/pages/shift/ShiftForm'))
const ShiftViewCard        = lazy(() => import('@/pages/shift/ShiftViewCard'))
const CustomShiftDetails   = lazy(() => import('@/pages/shift/CustomShiftDetails'))
const AssignShift          = lazy(() => import('@/pages/shift/AssignShift'))
const EmployeeShiftView    = lazy(() => import('@/pages/shift/EmployeeShiftView'))
const EmployeeShiftHistory = lazy(() => import('@/pages/shift/EmployeeShiftHistory'))

// ── Leave ─────────────────────────────────────────────────────────────────────
const LeaveManagement         = lazy(() => import('@/pages/leave/LeaveManagement'))
const EmployeeLeaveManagement = lazy(() => import('@/pages/leave/employee/EmployeeLeaveManagement'))

// ── Roles ─────────────────────────────────────────────────────────────────────
const RolesPermissions = lazy(() => import('@/pages/roles/RolesPermissions'))

// ── Master Data ───────────────────────────────────────────────────────────────
const DesignationManagement  = lazy(() => import('@/pages/masterdata/designation/DesignationManagement'))
const DocumentManagement     = lazy(() => import('@/pages/masterdata/documents/DocumentManagement'))
const DepartmentManagement   = lazy(() => import('@/pages/masterdata/department/DepartmentManagement'))
const BranchManagement       = lazy(() => import('@/pages/masterdata/branch/BranchManagement'))
const InternCourseManagement = lazy(() => import('@/pages/masterdata/interncourse/InternCourseManagement'))
const BreakPolicies          = lazy(() => import('@/pages/masterdata/breakpolicy/BreakPolicies'))
const HolidayManagement      = lazy(() => import('@/pages/masterdata/holiday/HolidayManagement'))

// ── Misc ──────────────────────────────────────────────────────────────────────
const ComingSoon  = lazy(() => import('@/pages/ComingSoon'))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))

// ── Helpers ───────────────────────────────────────────────────────────────────
const Loader = () => (
  <div className="flex h-screen items-center justify-center text-gray-500">
    Loading…
  </div>
)

const s = (Component) => (
  <Suspense fallback={<Loader />}>
    <Component />
  </Suspense>
)

/** Role-gated lazy route (uses the route's own path for permission lookup) */
const rr = (route, Component) => ({
  path: route,
  element: (
    <RoleRoute route={route}>
      <Suspense fallback={<Loader />}>
        <Component />
      </Suspense>
    </RoleRoute>
  ),
})

/** Shift sub-routes share the parent SHIFT permission */
const shiftRr = (route, Component) => ({
  path: route,
  element: (
    <RoleRoute route={ROUTES.SHIFT}>
      <Suspense fallback={<Loader />}>
        <Component />
      </Suspense>
    </RoleRoute>
  ),
})

// ── Router ────────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([

  // ── Auth pages — wrapped in PublicRoute so logged-in users skip them ────────
  {
    path: ROUTES.LOGIN,
    element: <PublicRoute>{s(LoginPage)}</PublicRoute>,
  },
  {
    path: '/forgot-password',
    element: <PublicRoute>{s(ForgotPasswordPage)}</PublicRoute>,
  },
  {
    path: '/verify-otp',
    // No PublicRoute here — user may need to refresh mid-flow without being
    // redirected to dashboard. State guard inside VerifyOTPPage handles this.
    element: s(VerifyOTPPage),
  },
  {
    path: '/reset-password',
    // Same reason — state guard inside ResetPasswordPage handles access.
    element: s(ResetPasswordPage),
  },

  // ── Protected application shell ────────────────────────────────────────────
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      // Default redirect to dashboard
      { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },

      // ── Dashboard
      rr(ROUTES.DASHBOARD, DashboardRouter),

      // ── Employee
      rr(ROUTES.EMPLOYEE,             EmployeeList),
      rr(ROUTES.EMPLOYEE_ADD_INTERN,  AddIntern),
      rr(ROUTES.EMPLOYEE_ADD_TRAINEE, AddTrainee),
      rr(ROUTES.EMPLOYEE_ADD,         AddEmployee),
      rr(ROUTES.EMPLOYEE_EDIT,        EditEmployee),

      // ── Attendance (Admin / HR view)
      rr(ROUTES.ATTENDANCE,         AttendanceOverview),
      rr(ROUTES.ATTENDANCE_PENDING, PendingApprovals),

      // ── Attendance (Employee / Intern / Trainee view)
      rr(ROUTES.ATTENDANCE_EMPLOYEE,         EmployeeAttendance),
      rr(ROUTES.ATTENDANCE_EMPLOYEE_HISTORY, EmployeeAttendanceHistory),
      rr(ROUTES.ATTENDANCE_CORRECTION_REQUEST, EmployeeAttendanceCorrectionRequest),

      // ── Shift Management (Admin / HR)
      rr(ROUTES.SHIFT,              ShiftManagement),
      shiftRr(ROUTES.SHIFT_NEW,    ShiftForm),
      shiftRr(ROUTES.SHIFT_EDIT,   ShiftForm),
      shiftRr(ROUTES.SHIFT_VIEW,   ShiftViewCard),
      shiftRr(ROUTES.SHIFT_CUSTOM, CustomShiftDetails),
      shiftRr(ROUTES.SHIFT_ASSIGN, AssignShift),

      // ── Shift (Employee / Intern / Trainee view)
      rr(ROUTES.SHIFT_EMPLOYEE,         EmployeeShiftView),
      rr(ROUTES.SHIFT_EMPLOYEE_HISTORY, EmployeeShiftHistory),

      // ── Leave
      rr(ROUTES.LEAVE,          LeaveManagement),
      rr(ROUTES.LEAVE_EMPLOYEE, EmployeeLeaveManagement),

      // ── Roles & Permissions (Admin only)
      rr(ROUTES.ROLES, RolesPermissions),

      // ── Master Data
      rr(ROUTES.DESIGNATION,   DesignationManagement),
      rr(ROUTES.DOCUMENTS,     DocumentManagement),
      rr(ROUTES.DEPARTMENT,    DepartmentManagement),
      rr(ROUTES.BRANCH,        BranchManagement),
      rr(ROUTES.INTERN_COURSE, InternCourseManagement),
      rr(ROUTES.BREAK_POLICY,  BreakPolicies),
      rr(ROUTES.HOLIDAY,       HolidayManagement),

      // ── Coming soon modules
      rr(ROUTES.PROJECTS,  ComingSoon),
      rr(ROUTES.TIMESHEET, ComingSoon),
      rr(ROUTES.REPORTS,   ComingSoon),
      rr(ROUTES.PAYROLL,   ComingSoon),

      // ── Profile (no role gate — any authenticated user)
      {
        path: ROUTES.PROFILE,
        element: (
          <Suspense fallback={<Loader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
    ],
  },

  // ── Catch-all ─────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
])