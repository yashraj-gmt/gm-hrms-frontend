// src/services/breakPolicyService.js
import apiClient from './apiClient'

const breakPolicyService = {

  /**
   * GET /api/break-policies
   * Returns only active (isActive=true) records — soft-deleted ones are excluded by the backend.
   * @param {{ page, size, search, category, isPaid }} params
   */ getAll: ({ page = 0, size = 10, search, category, isPaid, isActive } = {}) => {
    const params = { page, size }
    if (search)                                    params.search   = search
    if (category)                                  params.category = category
    if (isPaid    !== undefined && isPaid    !== null) params.isPaid   = isPaid
    if (isActive  !== undefined && isActive  !== null) params.isActive = isActive  // ← new
    return apiClient.get('/break-policies', { params })
  },

  /**
   * GET /api/break-policies/stats
   * Returns global counts independent of search / filter / pagination.
   * Used to populate stat cards so they never change with search.
   * Response: { total, active, fixed, flexible }
   */
  getStats: () =>
    apiClient.get('/break-policies/stats'),

  /**
   * GET /api/break-policies/:id
   */
  getById: (id) =>
    apiClient.get(`/break-policies/${id}`),

  /**
   * POST /api/break-policies
   * @param {Object} payload  BreakPolicyRequestDTO
   *   { breakName, breakCategory, breakStart, breakEnd, breakDurationMinutes, isPaid }
   */
  create: (payload) =>
    apiClient.post('/break-policies', payload),

  /**
   * PATCH /api/break-policies/:id
   * Any subset of BreakPolicyRequestDTO fields (including isActive to activate/deactivate via Edit form).
   * Note: Deactivating via Edit form (isActive=false) also hides the record from the listing,
   *       same as soft-delete. The distinction is the Delete action triggers a confirmation dialog.
   */
  update: (id, payload) =>
    apiClient.patch(`/break-policies/${id}`, payload),

  /**
   * DELETE /api/break-policies/:id
   * Soft-delete: sets isActive=false in DB. Record disappears from listing but data is retained.
   * Restricted to ADMIN role only.
   */
  delete: (id) =>
    apiClient.delete(`/break-policies/${id}`),
}

export default breakPolicyService