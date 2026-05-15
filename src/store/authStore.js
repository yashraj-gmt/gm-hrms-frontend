// src/store/authStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'


export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user:         null,   // UserInfo object from LoginResponseDTO
      token:        null,   // JWT access token
      refreshToken: null,   // JWT refresh token

      // isAuthenticated: () => Boolean(get().token && get().user),
      getRole:         () => get().user?.role ?? null,


      /**
       * Called after a successful login response.
       * @param {Object} data - LoginResponseDTO payload
       */
      login: (data) =>
        set({
          token:        data.token,
          refreshToken: data.refreshToken,
          user: {
            userId:      data.userId,
            username:    data.username,
            name:        data.fullName,
            fullName:    data.fullName,
            role:        data.role,
            department:  data.department,
            active:      data.active,
            avatar:      null, 
            designation: data.role,
          },
        }),

      /**
       * Update tokens after a silent refresh.
       */
      updateTokens: (accessToken, newRefreshToken) =>
        set({ token: accessToken, refreshToken: newRefreshToken }),

      /**
       * Clear all auth state.
       */
      logout: () =>
        set({ user: null, token: null, refreshToken: null }),
    }),
    {
      name:       'hrms-auth',
      partialize: (state) => ({
        user:         state.user,
        token:        state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
)

// export const useAuthStore = create(
//   persist(
//     (set) => ({
//       user: { name: 'Mac John', designation: 'Admin', role: 'ADMIN' },
//       // user: { name: 'Rajan Mehta', designation: 'HR', role: 'HR' },
//       // user: { name: 'Mark Parker', designation: 'Employee', role: 'EMPLOYEE' },
//       token: 'dev-token',
//       isAuthenticated: true,

//       login: (userData, token) => set({ user: userData, token, isAuthenticated: true }),
//       logout: () => set({ user: null, token: null, isAuthenticated: false }),
//       updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
//     }),
//     {
//       name: 'hrms-auth',
//       partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
//     }
//   )
// )