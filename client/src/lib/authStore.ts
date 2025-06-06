import { create } from 'zustand'

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
  logout: () => void
  checkAuthStatus: () => void
  setUser: (data: User) => void
  updateUser: (updatedData: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  logout: () => set({ user: null }),

  checkAuthStatus: async () => {
    set({ isLoading: true })

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()

        const userData: User = {
          username: data.username,
          email: data.email,
          id: data.id,
          role: data.role as Role,
        }

        set({ user: userData, isLoading: false })
      } else {
        set({ user: null, isLoading: false })
      }
    } catch (error) {
      console.error('Error checking authentication status:', error)
      set({ user: null, isLoading: false })
    }
  },

  setUser: (data: User) => set({ user: data }),

  updateUser: (updatedData: Partial<User>) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedData } : null,
    })),
}))

export default useAuthStore
