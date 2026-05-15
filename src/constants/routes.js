// src/constants/routes.js
export const ROUTES = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  LOGIN:          '/login',
  FORGOT_PASSWORD:'/forgot-password',
  VERIFY_OTP:     '/verify-otp',
  RESET_PASSWORD: '/reset-password',

  // ── Core ────────────────────────────────────────────────────────────────────
  DASHBOARD:      '/dashboard',
  PROFILE:        '/profile',

  // ── Employee Module ──────────────────────────────────────────────────────────
  EMPLOYEE:           '/employees',
  EMPLOYEE_ADD:       '/employees/add',
  EMPLOYEE_ADD_INTERN:'/employees/add-intern',
  EMPLOYEE_ADD_TRAINEE:'/employees/add-trainee',
  EMPLOYEE_EDIT:        '/employees/:id/edit', 

  // ── Attendance ───────────────────────────────────────────────────────────────
  ATTENDANCE:                  '/attendance',
  ATTENDANCE_EMPLOYEE:         '/my-attendance',
  ATTENDANCE_PENDING:          '/attendance/pending',
  ATTENDANCE_EMPLOYEE_HISTORY: '/my-attendance/history',
  ATTENDANCE_CORRECTION_REQUEST:  '/my-attendance/correction-request',

  // ── Shift Management ─────────────────────────────────────────────────────────
  SHIFT:              '/shifts',
  SHIFT_NEW:          '/shifts/new',
  SHIFT_EDIT:         '/shifts/:id/edit',
  SHIFT_VIEW:         '/shifts/:id',
  SHIFT_CUSTOM:       '/shifts/custom',
  SHIFT_ASSIGN:       '/shifts/assign',
  SHIFT_EMPLOYEE:     '/my-shift',
  SHIFT_EMPLOYEE_HISTORY: '/my-shift/history',

  // ── Leave ────────────────────────────────────────────────────────────────────
  LEAVE:          '/leave',
  LEAVE_EMPLOYEE: '/my-leave',

  // ── Roles & Permissions ───────────────────────────────────────────────────────
  ROLES:          '/roles',

  // ── Project & Timesheet ───────────────────────────────────────────────────────
  PROJECTS:       '/projects',
  TIMESHEET:      '/timesheet',

  // ── Reports & Payroll ─────────────────────────────────────────────────────────
  REPORTS:        '/reports',
  PAYROLL:        '/payroll',

  // ── Master Data ───────────────────────────────────────────────────────────────
  DESIGNATION:    '/master/designation',
  DEPARTMENT:     '/master/department',
  BRANCH:         '/master/branch',
  DOCUMENTS:      '/master/documents',
  INTERN_COURSE:  '/master/intern-course',
  BREAK_POLICY:   '/master/break-policy',
  HOLIDAY:        '/master/holiday',
}