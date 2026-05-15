// src/services/attendanceService.js
import apiClient from './apiClient'

const attendanceService = {

  // ── Employee actions (body-less — user resolved server-side from JWT) ───────
  checkIn:    () => apiClient.post('/attendance/check-in'),
  checkOut:   () => apiClient.post('/attendance/check-out'),
  breakStart: () => apiClient.post('/attendance/break-start'),
  breakEnd:   () => apiClient.post('/attendance/break-end'),

  // ── My attendance ────────────────────────────────────────────────────────────
  getMyToday: () => apiClient.get('/attendance/today/me'),

  getMyHistory: (page = 0, size = 8, params = {}) =>
    apiClient.get('/attendance/my-history', { params: { page, size, ...params } }),

  // ── Admin views ───────────────────────────────────────────────────────────────
  getAll: (page = 0, size = 10, params = {}) =>
    apiClient.get('/attendance', { params: { page, size, ...params } }),

  getDailySummary: (date) =>
    apiClient.get('/attendance/summary', { params: { date } }),

  getTodayById: (personalInformationId) =>
    apiClient.get(`/attendance/today/${personalInformationId}`),

  // ── Corrections ───────────────────────────────────────────────────────────────
  correctAttendance: (data) => apiClient.post('/attendance/correct', data),

  submitCorrectionRequest: (data) =>
    apiClient.post('/attendance/correction-requests', data),

  getCorrectionRequests: (page = 0, size = 10, status = '') =>
    apiClient.get('/attendance/correction-requests', {
      params: { page, size, ...(status ? { status } : {}) },
    }),

  approveCorrectionRequest: (id) =>
    apiClient.patch(`/attendance/correction-requests/${id}/approve`),

  rejectCorrectionRequest: (id, remarks = '') =>
    apiClient.patch(`/attendance/correction-requests/${id}/reject`, null, {
      params: { remarks },
    }),
}

export default attendanceService