import { create } from 'zustand'

export enum role {
  User = 1,
  Premium,
  Moderator,
  Admin,
}

export type user = {
  username: string
  email: string
  id: string
  role: role
}

interface AuthState {
  user: null | user
  isLoading: boolean
  logout: () => void
  checkAuthStatus: () => void
  setUser: (data: user) => void
  updateUser: (updatedData: Partial<user>) => void
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

        const userData: user = {
          username: data.username,
          email: data.email,
          id: data.id,
          role: data.role as role,
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

  setUser: (data: user) => set({ user: data }),

  updateUser: (updatedData: Partial<user>) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedData } : null,
    })),
}))

export default useAuthStore
