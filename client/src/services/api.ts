import type { Role } from '@/lib/authStore'

// Types
export type Ban = {
  id: number
  banned_at: string
  reason: string
  banned_by: string
  expires_at?: string
}

export type ApiError = {
  code: string
  message: string
}

export type User = {
  id: string
  username: string
  email: string
  role: Role
  activated: boolean
  created_at: string
  last_login?: string
  ban?: Ban
}

export async function login({
  email,
  password,
}: {
  email: string
  password: string
}) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Login API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function logout() {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/session`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Logout API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function listUsers(filters: Record<string, string> = {}) {
  try {
    const params = new URLSearchParams(filters).toString()
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/users/all?${params}`,
      {
        credentials: 'include',
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('List users API error:', error)
    return {
      success: false,
      error: { message: error },
    }
  }
}

export async function updateUserRole(userId: string, role: Role) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/users/${userId}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Update user role API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function banUser(
  userId: string,
  reason: string,
  duration: number = 1,
) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/users/ban`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          user_id: userId,
          duration,
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Ban user API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function unbanUser(userId: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/users/ban/${userId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unban user API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}