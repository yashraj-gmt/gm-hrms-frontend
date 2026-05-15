// src/services/profileService.js
import apiClient from './apiClient'

const profileService = {
  /**
   * GET /api/users/me
   * Returns current authenticated user's profile.
   */
  getMe: () => apiClient.get('/users/me'),

  /**
   * PUT /api/users/me
   * Updates editable profile fields (name, phone).
   * @param {{ name: string, phone: string }} data
   */
  updateProfile: (data) => apiClient.put('/users/me', data),

  /**
   * PUT /api/users/me/avatar
   * Uploads a new profile image.
   * @param {File} file
   */
  uploadAvatar: (file) => {
    const form = new FormData()
    form.append('profileImage', file)
    return apiClient.put('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default profileService