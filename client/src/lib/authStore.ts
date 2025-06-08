import { create } from 'zustand'
import { checkAuthentication } from '@/services/api'

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
  checkAuthStatus: () => void
  setUser: (data: User | null) => void
  updateUser: (updatedData: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  checkAuthStatus: async () => {
    set({ isLoading: true })

    const result = await checkAuthentication()

    if (result.success) {
      const userData: User = {
        username: result.data.username,
        email: result.data.email,
        id: result.data.id,
        role: result.data.role as Role,
      }

      set({ user: userData, isLoading: false })
    } else {
      set({ user: null, isLoading: false })
    }
  },

  setUser: (data: User | null) => set({ user: data }),

  updateUser: (updatedData: Partial<User>) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedData } : null,
    })),
}))

export default useAuthStore
