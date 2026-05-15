// src/services/authService.js
import apiClient from './apiClient'


const authService = {
    
  /**
   * POST /api/auth/login
   * @param {string} username
   * @param {string} password
   * @returns {Promise<LoginResponseDTO>}
   */
  login: (username, password) =>
    apiClient.post('/auth/login', { username, password }),

  /**
   * POST /api/auth/forgot-password
   * Triggers OTP generation and email dispatch.
   * @param {string} email
   */
  forgotPassword: (email) =>
    apiClient.post('/auth/forgot-password', { email }),

  /**
   * POST /api/auth/verify-otp
   * Validates the 6-digit OTP (must be done before reset).
   * @param {string} email
   * @param {string} otp  - 6-digit string
   */
  verifyOtp: (email, otp) =>
    apiClient.post('/auth/verify-otp', { email, otp }),

  /**
   * POST /api/auth/reset-password
   * Sets the new password; OTP is re-verified server-side.
   * @param {string} email
   * @param {string} otp
   * @param {string} newPassword
   */
  resetPassword: (email, otp, newPassword) =>
    apiClient.post('/auth/reset-password', { email, otp, newPassword }),

  /**
   * POST /api/auth/refresh
   * Exchange a refresh token for a new access token.
   * @param {string} refreshToken
   */
  refreshToken: (refreshToken) =>
    apiClient.post('/auth/refresh', { refreshToken }),

  /**
   * POST /api/auth/logout
   * Invalidates the refresh token server-side.
   * @param {string} refreshToken
   */
  logout: (refreshToken) =>
    apiClient.post('/auth/logout', { refreshToken }),

  /**
   * POST /api/auth/change-password
   * Requires a valid JWT (protected endpoint).
   * @param {string} oldPassword
   * @param {string} newPassword
   */
  changePassword: (oldPassword, newPassword) =>
    apiClient.post('/auth/change-password', { oldPassword, newPassword }),
}

export default authService