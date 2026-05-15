// src/services/departmentService.js
import apiClient from './apiClient'

const departmentService = {

  /**
   * GET /api/departments
   * @param {Object} params - { page, size, search, status }
   */
  getAll: ({ page = 0, size = 10, search = '', status = undefined } = {}) => {
    const params = { page, size }
    if (search)             params.search = search
    if (status !== undefined && status !== null && status !== '') {
      params.status = status   // true | false
    }
    return apiClient.get('/departments', { params })
  },

  /**
   * GET /api/departments/:id
   */
  getById: (id) =>
    apiClient.get(`/departments/${id}`),

  /**
   * POST /api/departments
   * @param {Object} payload - DepartmentRequestDTO
   */
  create: (payload) =>
    apiClient.post('/departments', payload),

  /**
   * PATCH /api/departments/:id
   * @param {number} id
   * @param {Object} payload - DepartmentRequestDTO (partial)
   */
  update: (id, payload) =>
    apiClient.patch(`/departments/${id}`, payload),

  /**
   * DELETE /api/departments/:id
   * Admin only — frontend must guard UI with role check before calling
   */
  delete: (id) =>
    apiClient.delete(`/departments/${id}`),
}

export default departmentService