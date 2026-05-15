// src/services/rolesService.js
// ─────────────────────────────────────────────────────────────────────────────
// All API calls for the Roles & Permissions module.
// Every method returns the unwrapped `data` field from ApiResponse<T>
// (apiClient interceptor already unwraps the outer envelope, so we get
//  { success, message, data } — we then return .data from each call).
// ─────────────────────────────────────────────────────────────────────────────

import apiClient from './apiClient'

const rolesService = {

  // ── Permission Matrix ─────────────────────────────────────────────────────

  /**
   * GET /api/roles/permissions?roleType=HR
   * Returns PermissionsMatrixResponseDTO
   */
  getPermissions: (roleType = 'HR') =>
    apiClient.get('/roles/permissions', { params: { roleType } })
      .then((res) => res.data),

  /**
   * PUT /api/roles/permissions
   * Body: SavePermissionsRequestDTO
   * Returns PermissionsMatrixResponseDTO
   */
  savePermissions: (payload) =>
    apiClient.put('/roles/permissions', payload)
      .then((res) => res.data),

  // ── Assigned Users ────────────────────────────────────────────────────────

  /**
   * GET /api/roles/assigned-users?roleType=HR
   * Returns AssignedUserResponseDTO[]
   */
  getAssignedUsers: (roleType = 'HR') =>
    apiClient.get('/roles/assigned-users', { params: { roleType } })
      .then((res) => res.data),

  /**
   * POST /api/roles/assign-users
   * Body: { roleType, assignedPersonIds: number[] }
   */
  assignUsers: (roleType, assignedPersonIds) =>
    apiClient.post('/roles/assign-users', { roleType, assignedPersonIds })
      .then((res) => res.data),

  // ── OTP (Transfer Authorization) ──────────────────────────────────────────

  /**
   * POST /api/roles/transfer/otp/generate
   * Body: { purpose: 'ROLE_TRANSFER' | 'DESIGNATION_TRANSFER' }
   */
  generateOtp: (purpose) =>
    apiClient.post('/roles/transfer/otp/generate', { purpose })
      .then((res) => res.data),

  /**
   * POST /api/roles/transfer/otp/verify
   * Body: { purpose, otp }
   * Throws on invalid / expired OTP.
   */
  verifyOtp: (purpose, otp) =>
    apiClient.post('/roles/transfer/otp/verify', { purpose, otp })
      .then((res) => res.data),

  // ── Role Transfer ─────────────────────────────────────────────────────────

  /**
   * POST /api/roles/transfer/role
   * Body: RoleTransferRequestDTO
   * Returns RoleTransferResponseDTO
   */
  confirmRoleTransfer: (payload) =>
    apiClient.post('/roles/transfer/role', payload)
      .then((res) => res.data),

  /**
   * GET /api/roles/transfer/role?page=0&size=10
   */
  listRoleTransfers: (page = 0, size = 10) =>
    apiClient.get('/roles/transfer/role', { params: { page, size } })
      .then((res) => res.data),

  /**
   * PATCH /api/roles/transfer/role/:id/cancel
   */
  cancelRoleTransfer: (id) =>
    apiClient.patch(`/roles/transfer/role/${id}/cancel`)
      .then((res) => res.data),

  // ── Designation Transfer ──────────────────────────────────────────────────

  /**
   * POST /api/roles/transfer/designation
   * Body: DesignationTransferRequestDTO
   * Returns DesignationTransferResponseDTO
   */
  confirmDesignationTransfer: (payload) =>
    apiClient.post('/roles/transfer/designation', payload)
      .then((res) => res.data),

  /**
   * GET /api/roles/transfer/designation?page=0&size=10
   */
  listDesignationTransfers: (page = 0, size = 10) =>
    apiClient.get('/roles/transfer/designation', { params: { page, size } })
      .then((res) => res.data),

  /**
   * PATCH /api/roles/transfer/designation/:id/cancel
   */
  cancelDesignationTransfer: (id) =>
    apiClient.patch(`/roles/transfer/designation/${id}/cancel`)
      .then((res) => res.data),

  // ── My Permissions ────────────────────────────────────────────────────────

  /**
   * GET /api/roles/my-permissions
   * Returns MyPermissionsResponseDTO[]
   */
  getMyPermissions: () =>
    apiClient.get('/roles/my-permissions')
      .then((res) => res.data),
}

export default rolesService