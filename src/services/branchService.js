// src/services/branchService.js
import apiClient from './apiClient'

// ─── Request mappers ─────────────────────────────────────────────────────────
const mapFormToCreateRequest = (form, parentId = null) => ({
  branchName: form.name,
  branchCode: form.code,
  active:     form.active,
  parentId:   parentId || null,
  address: {
    address:  form.address  || '',
    landmark: form.landmark || '',
    city:     form.city     || '',
    district: form.district || '',
    state:    form.state    || '',
    pinCode:  form.pincode  || '',
    country:  form.country  || 'India',
  },
})

const mapFormToUpdateRequest = (form) => ({
  branchName: form.name,
  branchCode: form.code,
  active:     form.active,
  address: {
    address:  form.address  || '',
    landmark: form.landmark || '',
    city:     form.city     || '',
    district: form.district || '',
    state:    form.state    || '',
    pinCode:  form.pincode  || '',
    country:  form.country  || 'India',
  },
})

// ─── Service ─────────────────────────────────────────────────────────────────
const branchService = {

  /**
   * GET /api/branches/tree
   * Returns the full branch hierarchy as a nested tree structure.
   * Response: ApiResponse<List<BranchResponseDTO>>  (with children populated)
   */
  getTree: () => apiClient.get('/branches/tree'),

  /**
   * GET /api/branches/:id
   * Returns a single branch by ID.
   */
  getById: (id) => apiClient.get(`/branches/${id}`),

  /**
   * POST /api/branches
   * Create a new branch with optional parent.
   * @param {object} form   – frontend form values
   * @param {number|null} parentId – parent branch ID (null = root)
   */
  create: (form, parentId = null) =>
    apiClient.post('/branches', mapFormToCreateRequest(form, parentId)),

  /**
   * PATCH /api/branches/:id
   * Update existing branch details (partial update).
   * @param {number} id   – branch ID
   * @param {object} form – frontend form values
   */
  update: (id, form) =>
    apiClient.patch(`/branches/${id}`, mapFormToUpdateRequest(form)),

  /**
   * DELETE /api/branches/:id
   * Soft-delete (deactivate) a branch. Only ADMIN role.
   */
  delete: (id) => apiClient.delete(`/branches/${id}`),

  /**
   * POST /api/branches/reorder
   * Persist the drag-and-drop order + parent changes.
   * @param {Array<{id, parentId, sortOrder}>} items
   */
  reorder: (items) => apiClient.post('/branches/reorder', { items }),

}

export default branchService