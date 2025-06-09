// authStore.ts
import { create } from 'zustand'
import { API } from '@/services/api'

export enum Role {
  User = 'user',
  Premium = 'premium',
  Moderator = 'moderator',
  Admin = 'admin',
}

export type User = {
  username: string
  email: string
  id: string
  role: Role
}

interface AuthState {
  user: null | User
  isLoading: boolean
  isAuthenticated: boolean
  checkAuthStatus: () => Promise<void>
  setUser: (data: User | null) => void
  updateUser: (updatedData: Partial<User>) => void
  clearAuth: () => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  checkAuthStatus: async () => {
    set({ isLoading: true })

    const result = await API.get('/users/me')

    if (result.success) {
      const userData: User = {
        username: result.data.username,
        email: result.data.email,
        id: result.data.id,
        role: result.data.role as Role,
      }

      set({
        user: userData,
        isLoading: false,
        isAuthenticated: true
      })
    } else {
      set({
        user: null,
        isLoading: false,
        isAuthenticated: false
      })
    }
  },

  setUser: (data: User | null) =>
    set({
      user: data,
      isAuthenticated: !!data
    }),

  updateUser: (updatedData: Partial<User>) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedData } : null,
    })),

  clearAuth: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false
    }),

  logout: async () => {
    try {
      await API.delete('/auth/session')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      get().clearAuth()
    }
  }
}))

export default useAuthStore