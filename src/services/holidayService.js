import apiClient from './apiClient'

const holidayService = {

  /**
   * POST /holidays  →  ADMIN + HR
   */
  create: (dto) =>
    apiClient.post('/holidays', dto),

  /**
   * PATCH /holidays/:id  →  ADMIN + HR
   * Partial update — includes isActive for status toggle from Edit form.
   */
  update: (id, dto) =>
    apiClient.patch(`/holidays/${id}`, dto),

  /** GET /holidays/:id  →  ADMIN + HR */
  getById: (id) =>
    apiClient.get(`/holidays/${id}`),

  /**
   * GET /holidays  →  ADMIN + HR
   * Server-side search and filtering across all non-deleted records.
   * @param {{ page, size, search, type, isActive, isOptional }} params
   */
  getAll: ({ page = 0, size = 10, search, type, isActive, isOptional } = {}) => {
    const params = { page, size }
    if (search)                                        params.search     = search
    if (type)                                          params.type       = type
    if (isActive   !== undefined && isActive   !== null) params.isActive   = isActive
    if (isOptional !== undefined && isOptional !== null) params.isOptional = isOptional
    return apiClient.get('/holidays', { params })
  },

  /**
   * GET /holidays/stats
   * Global counts independent of search / filter / pagination.
   * Response: { total, active, upcoming, optional }
   */
  getStats: () =>
    apiClient.get('/holidays/stats'),

  /**
   * DELETE /holidays/:id  →  ADMIN only
   * Soft-delete: sets isDeleted=true. Record disappears from listing; data retained in DB.
   */
  delete: (id) =>
    apiClient.delete(`/holidays/${id}`),
}

export default holidayService