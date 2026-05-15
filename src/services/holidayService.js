// src/services/holidayService.js
import apiClient from './apiClient'

const holidayService = {

  /** POST /holidays  →  ADMIN + HR */
  create: (dto) =>
    apiClient.post('/holidays', dto),

  /**
   * PATCH /holidays/:id  →  ADMIN + HR
   * Backend uses @PatchMapping so partial updates are supported.
   */
  update: (id, dto) =>
    apiClient.patch(`/holidays/${id}`, dto),

  /** GET /holidays/:id  →  ADMIN + HR */
  getById: (id) =>
    apiClient.get(`/holidays/${id}`),

  /**
   * GET /holidays?page=0&size=8  →  ADMIN + HR
   * @param {number} page  0-based
   * @param {number} size
   */
  getAll: (page = 0, size = 8) =>
    apiClient.get('/holidays', { params: { page, size } }),

  /** DELETE /holidays/:id  →  ADMIN only */
  delete: (id) =>
    apiClient.delete(`/holidays/${id}`),
}

export default holidayService