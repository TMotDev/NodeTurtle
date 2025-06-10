import type { Role } from '@/lib/authStore'
import useAuthStore from '@/lib/authStore'

export type Ban = {
  id: number
  banned_at: string
  reason: string
  banned_by: string
  expires_at?: string
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

type ApiResponse<T = any> =
  | { success: true; data: T }
  | { success: false; error: string }

type QueuedRequest = {
  resolve: (value: any) => void
  reject: (reason: any) => void
  url: string
  options: RequestInit
}

class FetchHandler {
  private baseURL: string
  private refreshPromise: Promise<boolean> | null = null
  private requestQueue: Array<QueuedRequest> = []
  private isRefreshing = false

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        // Clear auth state if refresh fails
        useAuthStore.getState().clearAuth()
        return false
      }

      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      useAuthStore.getState().clearAuth()
      return false
    }
  }

  private processQueue(success: boolean) {
    const queue = [...this.requestQueue]
    this.requestQueue = []

    if (success) {
      // Retry all queued requests
      queue.forEach(({ resolve, url, options }) => {
        resolve(this.makeRequest(url, options, true))
      })
    } else {
      // Reject all queued requests
      queue.forEach(({ reject }) => {
        reject(new Error('Authentication failed'))
      })
    }
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    isRetry: boolean = false,
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        credentials: 'include',
      })

      // Handle status 401 - Token expired
      if (response.status === 401 && !isRetry) {
        if (this.isRefreshing) {
          // If refresh is in progress, queue the request
          return new Promise((resolve, reject) => {
            this.requestQueue.push({
              resolve,
              reject,
              url,
              options,
            })
          })
        }

        // Start refresh process
        this.isRefreshing = true

        if (!this.refreshPromise) {
          this.refreshPromise = this.refreshToken()
        }

        try {
          const refreshSuccess = await this.refreshPromise
          this.refreshPromise = null
          this.isRefreshing = false

          // Process queued requests
          this.processQueue(refreshSuccess)

          if (refreshSuccess) {
            // Retry the original request
            return this.makeRequest<T>(url, options, true)
          } else {
            return { success: false, error: 'Authentication failed' }
          }
        } catch (refreshError) {
          this.isRefreshing = false
          this.refreshPromise = null
          this.processQueue(false)
          return { success: false, error: 'Authentication failed' }
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error:
            errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json().catch(() => ({}))
      return { success: true, data }
    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      }
    }
  }

  async get<T>(url: string, options: RequestInit = {}): Promise<ApiResponse> {
    return this.makeRequest<T>(url, { ...options, method: 'GET' })
  }

  async post<T>(
    url: string,
    body?: any,
    options: RequestInit = {},
  ): Promise<ApiResponse> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(
    url: string,
    body?: any,
    options: RequestInit = {},
  ): Promise<ApiResponse> {
    return this.makeRequest<T>(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<ApiResponse> {
    return this.makeRequest<T>(url, { ...options, method: 'DELETE' })
  }
}

export const API = new FetchHandler()
