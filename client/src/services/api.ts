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

export async function checkUsernameAvailablity(username: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/users/username/${username}`,
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, exists: false, error: errorData.message }
    }

    const data = await response.json()

    return { success: true, exists: data.exists }
  } catch (error) {
    console.error('username availability check API error:', error)
    return {
      success: false,
      exists: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function checkEmailAvailablity(email: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/users/email/${email}`,
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, exists: false, error: errorData.message }
    }

    const data = await response.json()

    return { success: true, exists: data.exists }
  } catch (error) {
    console.error('email availability check API error:', error)
    return {
      success: false,
      exists: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function register(
  username: string,
  email: string,
  password: string,
) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Register API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function login(email: string, password: string) {
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

export async function checkAuthentication() {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Authentication API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function changeEmail(email: string, password: string) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Change email API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function changeUsername(username: string, password: string) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Change username API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function changePassword(
  old_password: string,
  new_password: string,
) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/users/me/password`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ old_password, new_password }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Change password API error:', error)
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
  duration: number = 999999, // default permanent bar
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

export async function activateAccount(token: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/users/activate/${token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    return { success: true }
  } catch (error) {
    console.error('activate account API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function deactivateAccount(token: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/deactivate/${token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Deactivate account API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function resetPassword(token: string, password: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/password/reset/${token}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Password reset API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/password/request-reset`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Password reset request API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}

export async function requestAccountDeactivation(password: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/users/me/deactivate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Deactivate account request API error:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred.' },
    }
  }
}
