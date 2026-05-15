// src/services/leaveService.js
import apiClient from './apiClient'

const leaveService = {

  // ── Leave Requests ────────────────────────────────────────────────────────
  getAllRequests: (page = 0, size = 10) =>
    apiClient.get('/leave-requests', { params: { page, size } }),

  getMyLeaves: (personalId, page = 0, size = 10) =>
    apiClient.get(`/leave-requests/${personalId}`, { params: { page, size } }),

  applyLeave: (dto) =>
    apiClient.post('/leave-requests', dto),

  approveLeave: (id, approverId) =>
    apiClient.patch(`/leave-requests/${id}/approve`, null, { params: { approverId } }),

  rejectLeave: (id, reason) =>
    apiClient.patch(`/leave-requests/${id}/reject`, null, { params: { reason } }),

  cancelLeave: (id, cancelReason) =>
  apiClient.patch(`/leave-requests/${id}/cancel`, { cancelReason }),

  requestDocument: (id) =>
    apiClient.patch(`/leave-requests/${id}/request-document`),

  // ── Leave Balance ─────────────────────────────────────────────────────────
  searchBalance: (filter = {}, page = 0, size = 10) =>
    apiClient.post('/leave-balance/search', filter, { params: { page, size } }),

  // ── Leave Types ───────────────────────────────────────────────────────────
  getAllLeaveTypes: (search = '', page = 0, size = 50) =>
    apiClient.get('/leave-types', { params: { search, page, size } }),

  getLeaveTypeById: (id) =>
    apiClient.get(`/leave-types/${id}`),

  createLeaveType: (dto) =>
    apiClient.post('/leave-types', dto),

  updateLeaveType: (id, dto) =>
    apiClient.patch(`/leave-types/${id}`, dto),

  deleteLeaveType: (id) =>
    apiClient.delete(`/leave-types/${id}`),

  // ── Leave Policies ────────────────────────────────────────────────────────
  getAllPolicies: (page = 0, size = 50) =>
    apiClient.get('/leave-policies', { params: { page, size } }),

  getPolicyById: (id) =>
    apiClient.get(`/leave-policies/${id}`),

  createPolicy: (dto) =>
    apiClient.post('/leave-policies', dto),

  updatePolicy: (id, dto) =>
    apiClient.put(`/leave-policies/${id}`, dto),

  patchPolicy: (id, dto) =>
    apiClient.patch(`/leave-policies/${id}`, dto),

  deletePolicy: (id) =>
    apiClient.delete(`/leave-policies/${id}`),

  // ── Policy Mapping (Policy ↔ LeaveType) ───────────────────────────────────
  getAllPolicyMappings: (page = 0, size = 50) =>
    apiClient.get('/policy-mapping', { params: { page, size } }),

  getPolicyMappingById: (id) =>
    apiClient.get(`/policy-mapping/${id}`),

  createPolicyMapping: (dto) =>
    apiClient.post('/policy-mapping', dto),

  updatePolicyMapping: (id, dto) => 
    apiClient.patch(`/policy-mapping/${id}`, dto),

  deletePolicyMapping: (id) =>
    apiClient.delete(`/policy-mapping/${id}`),

  // ── Application Rules ─────────────────────────────────────────────────────
  getAllApplicationRules: (page = 0, size = 50) =>
    apiClient.get('/leave-application-rules', { params: { page, size } }),

  getApplicationRuleByPolicy: (policyId) =>
    apiClient.get(`/leave-application-rules/policy/${policyId}`),

  createApplicationRule: (dto) =>
    apiClient.post('/leave-application-rules', dto),

  updateApplicationRule: (id, dto) =>
    apiClient.patch(`/leave-application-rules/${id}`, dto),

  deleteApplicationRule: (id) =>
    apiClient.delete(`/leave-application-rules/${id}`),

  // ── Eligibility Rules ─────────────────────────────────────────────────────
  getAllEligibilityRules: (page = 0, size = 50) =>
    apiClient.get('/leave-eligibility-rules', { params: { page, size } }),

  getEligibilityRuleByPolicy: (policyId) =>
    apiClient.get(`/leave-eligibility-rules/policy/${policyId}`),

  createEligibilityRule: (dto) =>
    apiClient.post('/leave-eligibility-rules', dto),

  updateEligibilityRule: (id, dto) =>
    apiClient.patch(`/leave-eligibility-rules/${id}`, dto),

  deleteEligibilityRule: (id) =>
    apiClient.delete(`/leave-eligibility-rules/${id}`),

  // ── Encashment Rules ──────────────────────────────────────────────────────
  getEncashmentRuleByPolicy: (policyId) =>
    apiClient.get(`/leave-encashment-rules/policy/${policyId}`),

  getAllEncashmentRules: (page = 0, size = 50) =>
    apiClient.get('/leave-encashment-rules', { params: { page, size } }),

  createEncashmentRule: (dto) =>
    apiClient.post('/leave-encashment-rules', dto),

  updateEncashmentRule: (id, dto) =>
    apiClient.patch(`/leave-encashment-rules/${id}`, dto),

  deleteEncashmentRule: (id) =>
    apiClient.delete(`/leave-encashment-rules/${id}`),

  // ── Comp Off ──────────────────────────────────────────────────────────────
  getAllCompOff: (page = 0, size = 10) =>
    apiClient.get('/comp-off-requests', { params: { page, size } }),

  getCompOffByUser: (personalId) =>
    apiClient.get(`/comp-off-requests/user/${personalId}`),

  applyCompOff: (dto) =>
    apiClient.post('/comp-off-requests', dto),

  approveCompOff: (id, approverId) =>
    apiClient.patch(`/comp-off-requests/${id}/approve`, null, { params: { approverId } }),

  rejectCompOff: (id, approverId) =>
    apiClient.patch(`/comp-off-requests/${id}/reject`, null, { params: { approverId } }),

  // ── Leave Encashment Requests ─────────────────────────────────────────────
  getAllEncashmentRequests: (page = 0, size = 10) =>
    apiClient.get('/leave-encashment-requests', { params: { page, size } }),

  createEncashmentRequest: (dto) =>
    apiClient.post('/leave-encashment-requests', dto),

  // ── Leave Transactions ────────────────────────────────────────────────────
  searchTransactions: (filter = {}, page = 0, size = 10) =>
    apiClient.post('/leave-transactions/search', filter, { params: { page, size } }),

  // ── Leave Documents ───────────────────────────────────────────────────────
  uploadDocuments: (leaveId, personalId, files) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    return apiClient.post(`/leave-documents/${leaveId}`, form, {
      params: { personalId },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getDocuments: (leaveId) =>
    apiClient.get(`/leave-documents/${leaveId}`),

  deleteDocument: (id) =>
    apiClient.delete(`/leave-documents/${id}`),
}

export default leaveService