// src/services/designationService.js

import apiClient from './apiClient'

const designationService = {

  /** POST /designations  →  ADMIN + HR */
  create: (dto) =>
    apiClient.post('/designations', dto),

  /** PUT /designations/:id  →  ADMIN + HR */
  update: (id, dto) =>
    apiClient.put(`/designations/${id}`, dto),

  /** GET /designations/:id  →  ADMIN + HR + EMPLOYEE */
  getById: (id) =>
    apiClient.get(`/designations/${id}`),

  /**
   * GET /designations?page=0&size=8  →  ADMIN + HR + EMPLOYEE
   * @param {number} page  0-based (Spring Data uses 0-indexed pages)
   * @param {number} size
   */
  getAll: (page = 0, size = 8) =>
    apiClient.get('/designations', { params: { page, size } }),

  /** DELETE /designations/:id  →  ADMIN only (soft-delete via setActive(false)) */
  delete: (id) =>
    apiClient.delete(`/designations/${id}`),
}

export default designationService