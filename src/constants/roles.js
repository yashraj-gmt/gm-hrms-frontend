// src/constants/roles.js
export const ROLES = {
  ADMIN:    'ADMIN',
  HR:       'HR',
  EMPLOYEE: 'EMPLOYEE',
  INTERN:   'INTERN',
  TRAINEE:  'TRAINEE',
}

// Display labels per role (used in UI)
export const ROLE_LABELS = {
  [ROLES.ADMIN]:    'Administrator',
  [ROLES.HR]:       'HR Manager',
  [ROLES.EMPLOYEE]: 'Employee',
  [ROLES.INTERN]:   'Intern',
  [ROLES.TRAINEE]:  'Trainee',
}

// Badge colors per role (Tailwind-compatible values)
export const ROLE_COLORS = {
  [ROLES.ADMIN]:    { bg: '#FEF3C7', text: '#92400E' },
  [ROLES.HR]:       { bg: '#DBEAFE', text: '#1E40AF' },
  [ROLES.EMPLOYEE]: { bg: '#D1FAE5', text: '#065F46' },
  [ROLES.INTERN]:   { bg: '#EDE9FE', text: '#5B21B6' },
  [ROLES.TRAINEE]:  { bg: '#FCE7F3', text: '#9D174D' },
}