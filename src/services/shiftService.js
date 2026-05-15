import apiClient from './apiClient'
 
const shiftService = {
 
  // ── SHIFTS (Admin / HR) ───────────────────────────────────────────────────
 
  /** Create a new shift */
  create: (payload) => apiClient.post('/shifts', payload),
 
  /** Update an existing shift */
  update: (id, payload) => apiClient.patch(`/shifts/${id}`, payload),
 
  /** Get paginated list */
  getAll: (page = 0, size = 10) =>
    apiClient.get('/shifts', { params: { page, size } }),
 
  /** Get single shift details */
  getById: (id) => apiClient.get(`/shifts/${id}`),
 
  /** Toggle active / inactive */
  toggleStatus: (id) => apiClient.patch(`/shifts/${id}/toggle-status`),
 
  /** Soft-delete */
  delete: (id) => apiClient.delete(`/shifts/${id}`),
 
  // ── ASSIGNMENTS (Admin / HR) ───────────────────────────────────────────────
 
  /** Assign shift to one or many persons */
  assign: (payload) => apiClient.post('/shift-assignments', payload),
 
  /** Paginated list of all assignments */
  getAllAssignments: (page = 0, size = 10) =>
    apiClient.get('/shift-assignments', { params: { page, size } }),
 
  /** Search eligible persons for assign-shift dropdown */
  searchEligiblePersons: (search = '') =>
    apiClient.get('/shift-assignments/eligible-persons', { params: { search } }),
 
  // ── EMPLOYEE / INTERN / TRAINEE ────────────────────────────────────────────
 
  /** Active shift for the logged-in user */
  getMyCurrentShift: () => apiClient.get('/shift-assignments/my-current'),
 
  /** Full shift history for the logged-in user */
  getMyShiftHistory: (page = 0, size = 8) =>
    apiClient.get('/shift-assignments/my-history', { params: { page, size } }),
}
 
export default shiftService