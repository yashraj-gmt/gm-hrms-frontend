// src/services/documentService.js
// ─── All Document Type API calls ──────────────────────────────────────────────
// Backend base: /api/document-types
//
// Endpoints:
//   POST   /api/document-types
//   PATCH  /api/document-types/:id
//   DELETE /api/document-types/:id      ← soft delete (sets active=false)
//   GET    /api/document-types?page&size
//   GET    /api/document-types/:id
//   GET    /api/document-types/type/:type?page&size   (EMPLOYEE|INTERN|TRAINEE)
//   GET    /api/document-types/stats

import apiClient from './apiClient'

const BASE = '/document-types'

const documentService = {

  /**
   * Create a new document type.
   * @param {{ name: string, key: string, applicableTypes: string[], mandatory: boolean }} payload
   * @returns {Promise<DocumentTypeResponseDTO>}
   */
  create(payload) {
    return apiClient.post(BASE, payload)
  },

  /**
   * Update an existing document type.
   * Send `active: true|false` to toggle status.
   * @param {number} id
   * @param {{ name: string, key: string, applicableTypes: string[], mandatory: boolean, active?: boolean }} payload
   * @returns {Promise<DocumentTypeResponseDTO>}
   */
  update(id, payload) {
    return apiClient.patch(`${BASE}/${id}`, payload)
  },

  /**
   * Soft-delete a document type (sets active = false in DB).
   * The record remains in the DB and still appears in the listing
   * with an "Inactive" status badge.
   * @param {number} id
   * @returns {Promise<void>}
   */
  delete(id) {
    return apiClient.delete(`${BASE}/${id}`)
  },

  /**
   * Get paginated list of ALL document types (active + inactive).
   * @param {number} page  0-indexed
   * @param {number} size
   * @returns {Promise<PageResponseDTO<DocumentTypeResponseDTO>>}
   */
  getAll(page = 0, size = 10) {
    return apiClient.get(`${BASE}?page=${page}&size=${size}`)
  },

  /**
   * Get a single document type by ID.
   * @param {number} id
   * @returns {Promise<DocumentTypeResponseDTO>}
   */
  getById(id) {
    return apiClient.get(`${BASE}/${id}`)
  },

  /**
   * Get paginated list filtered by applicable type.
   * Returns ALL (active + inactive) matching that type.
   * @param {'EMPLOYEE'|'INTERN'|'TRAINEE'} type
   * @param {number} page  0-indexed
   * @param {number} size
   * @returns {Promise<PageResponseDTO<DocumentTypeResponseDTO>>}
   */
  getByApplicableType(type, page = 0, size = 10) {
    return apiClient.get(`${BASE}/type/${type}?page=${page}&size=${size}`)
  },

  /**
   * Get stats counts: total, active, inactive.
   * @returns {Promise<{ total: number, active: number, inactive: number }>}
   */
  getStats() {
    return apiClient.get(`${BASE}/stats`)
  },
}

export default documentService