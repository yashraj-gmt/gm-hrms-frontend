// src/services/breakPolicyService.js
import apiClient from './apiClient'

const breakPolicyService = {

  /**
   * GET /api/break-policies
   * @param {{ page, size, search, category, isPaid }} params
   */
  getAll: ({ page = 0, size = 10, search, category, isPaid } = {}) => {
    const params = { page, size }
    if (search)                params.search   = search
    if (category)              params.category = category   // FIXED | FLEXIBLE
    if (isPaid !== undefined && isPaid !== null) params.isPaid = isPaid
    return apiClient.get('/break-policies', { params })
  },

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
   * Any subset of BreakPolicyRequestDTO fields (including isActive for toggle)
   */
  update: (id, payload) =>
    apiClient.patch(`/break-policies/${id}`, payload),

  /**
   * DELETE /api/break-policies/:id  — soft-deactivates (Admin only)
   */
  delete: (id) =>
    apiClient.delete(`/break-policies/${id}`),

  /**
   * Convenience: toggle active status via PATCH
   * @param {number} id
   * @param {boolean} isActive
   */
  toggleStatus: (id, isActive) =>
    apiClient.patch(`/break-policies/${id}`, { isActive }),
}

export default breakPolicyService