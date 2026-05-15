// src/services/internCourseService.js
// ─── All Intern Course API calls ──────────────────────────────────────────────
// Backend base: /api/intern-courses
//
// Endpoints:
//   POST   /api/intern-courses
//   PATCH  /api/intern-courses/:id
//   DELETE /api/intern-courses/:id      ← soft delete (sets status = false)
//   GET    /api/intern-courses?page&size
//   GET    /api/intern-courses/:id
//   GET    /api/intern-courses/stats

import apiClient from './apiClient'

const BASE = '/intern-courses'

const internCourseService = {

  /**
   * Create a new intern course.
   * @param {{ name: string, description?: string, status?: boolean }} payload
   * @returns {Promise<InternCourseResponseDTO>}
   */
  create(payload) {
    return apiClient.post(BASE, payload)
  },

  /**
   * Update an existing intern course.
   * Send { status: true } to re-activate a soft-deleted course.
   * @param {number} id
   * @param {{ name?: string, description?: string, status?: boolean }} payload
   * @returns {Promise<InternCourseResponseDTO>}
   */
  update(id, payload) {
    return apiClient.patch(`${BASE}/${id}`, payload)
  },

  /**
   * Soft-delete a course (sets status = false in DB).
   * Record stays in DB and still appears in listing with Inactive badge.
   * Re-activate via update(id, { status: true }).
   * @param {number} id
   * @returns {Promise<void>}
   */
  delete(id) {
    return apiClient.delete(`${BASE}/${id}`)
  },

  /**
   * Get paginated list of ALL courses (active + inactive).
   * @param {number} page  0-indexed
   * @param {number} size
   * @returns {Promise<PageResponseDTO<InternCourseResponseDTO>>}
   */
  getAll(page = 0, size = 10) {
    return apiClient.get(`${BASE}?page=${page}&size=${size}`)
  },

  /**
   * Get a single course by ID.
   * @param {number} id
   * @returns {Promise<InternCourseResponseDTO>}
   */
  getById(id) {
    return apiClient.get(`${BASE}/${id}`)
  },

  /**
   * Get stats counts: total, active, inactive.
   * @returns {Promise<{ total: number, active: number, inactive: number }>}
   */
  getStats() {
    return apiClient.get(`${BASE}/stats`)
  },
}

export default internCourseService