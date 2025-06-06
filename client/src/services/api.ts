import type { Role } from '@/lib/authStore'

export type Ban = {
  id: number
  banned_at: string
  reason: string
  banned_by: string
  expires_at?: string
}

export type error = {
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

export async function listUsers(filters: any) {
  const params = new URLSearchParams(filters).toString()

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/admin/users/all?${params}`,
    {
      credentials: 'include',
    },
  )

  return await response.json()
}

export async function updateUserRole(userId: string, role: Role) {
  const payload = { role: role }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/admin/users/${userId}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))

    return { error: errorData }
  }

  return { success: true }
}
export async function banUser(
  userId: string,
  reason: string,
  duration: number = 1,
) {
  const payload = {
    reason: reason,
    user_id: userId,
    duration: duration,
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/admin/users/ban`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))

    return { error: errorData }
  }

  return { success: true }
}
export async function unbanUser(userId: string) {
   const response = await fetch(
    `${import.meta.env.VITE_API_URL}/admin/users/ban/${userId}`,
    {
      method: 'DELETE',
      credentials: 'include',
    },
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    return { error: errorData }
  }

  return { success: true }
}
