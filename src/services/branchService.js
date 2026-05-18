// src/services/branchService.js
import apiClient from './apiClient'

// ─── Request mappers ─────────────────────────────────────────────────────────
const buildAddressPayload = (form) => ({
  addressLine: form.address  || '',  
  landmark:    form.landmark || '',
  city:        form.city     || '',
  district:    form.district || '',
  state:       form.state    || '',
  pinCode:     form.pincode  || '',
  country:     form.country  || 'India',
})

const mapFormToCreateRequest = (form, parentId = null) => ({
  branchName: form.name,
  branchCode: form.code,
  active:     form.active,
  parentId:   parentId || null,
  address:    buildAddressPayload(form),
})

const mapFormToUpdateRequest = (form) => ({
  branchName: form.name,
  branchCode: form.code,
  active:     form.active,
  address:    buildAddressPayload(form),
})

// Service
const branchService = {

  /** GET /api/branches/tree*/
  getTree: () => apiClient.get('/branches/tree'),

  /** GET /api/branches/:id */
  getById: (id) => apiClient.get(`/branches/${id}`),

  /**
   * POST /api/branches
   * @param {object}      form     – frontend form values
   * @param {number|null} parentId – parent branch ID (null = root)
   */
  create: (form, parentId = null) =>
    apiClient.post('/branches', mapFormToCreateRequest(form, parentId)),

  /**
   * PATCH /api/branches/:id
   * @param {number} id
   * @param {object} form
   */
  update: (id, form) =>
    apiClient.patch(`/branches/${id}`, mapFormToUpdateRequest(form)),

  /** DELETE /api/branches/:id — soft-delete (ADMIN only) */
  delete: (id) => apiClient.delete(`/branches/${id}`),

  /**
   * POST /api/branches/reorder
   * @param {Array<{id, parentId, sortOrder}>} items
   */
  reorder: (items) => apiClient.post('/branches/reorder', { items }),
}

export default branchService