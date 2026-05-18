// src/services/documentService.js
import apiClient from './apiClient'

const BASE = '/document-types'

const documentService = {

  /**
   * Create a new document type.
   */
  create(payload) {
    return apiClient.post(BASE, payload)
  },

  /**
   * Update an existing document type.
   * Pass `active: false` to mark as inactive (without deleting).
   */
  update(id, payload) {
    return apiClient.patch(`${BASE}/${id}`, payload)
  },

  /**
   * Soft-delete: sets deleted=true in the DB.
   * The record is permanently hidden from all listings but stays in the database.
   * Unlike deactivate (active=false), a deleted document cannot be recovered via UI.
   */
  delete(id) {
    return apiClient.delete(`${BASE}/${id}`)
  },

  /**
   * Get paginated list of non-deleted document types (active + inactive).
   * Optionally filter by one or more applicable types.
   *
   * @param {number}   page            0-indexed
   * @param {number}   size
   * @param {string[]} applicableTypes e.g. ['EMPLOYEE', 'INTERN']  (empty = no filter)
   */
  getAll(page = 0, size = 10, applicableTypes = []) {
    const params = new URLSearchParams({ page, size })
    // Spring accepts repeated params: ?applicableTypes=EMPLOYEE&applicableTypes=INTERN
    applicableTypes.forEach((t) => params.append('applicableTypes', t))
    return apiClient.get(`${BASE}?${params.toString()}`)
  },

  /**
   * Get a single document type by ID.
   */
  getById(id) {
    return apiClient.get(`${BASE}/${id}`)
  },

  /**
   * Get stats counts for non-deleted docs: { total, active, inactive }.
   */
  getStats() {
    return apiClient.get(`${BASE}/stats`)
  },
}

export default documentService