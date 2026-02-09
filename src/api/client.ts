import type { ApiError, ApiResponse } from './types'

// Use empty string for local development (uses Vite proxy), or full URL for production
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + '/api'
  : '/api'

const TOKEN_KEY = 'supernavi_token'

class ApiClient {
  private baseUrl: string

  constructor (baseUrl: string) {
    this.baseUrl = baseUrl
  }

  // Token management (public)
  getToken (): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  setToken (token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  }

  clearToken (): void {
    localStorage.removeItem(TOKEN_KEY)
  }

  // HTTP method shortcuts (public)
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>('GET', path, { params })
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body })
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body })
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body })
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  // Auth-specific methods (no auth header needed for login/register)
  postPublic<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body, includeAuth: false })
  }

  getPublic<T>(path: string): Promise<T> {
    return this.request<T>('GET', path, { includeAuth: false })
  }

  // Private methods below

  // Build headers with optional auth
  private buildHeaders (options?: { includeAuth?: boolean, contentType?: string, hasBody?: boolean }): Headers {
    const headers = new Headers()

    // Only set Content-Type if there's a body to send
    if (options?.hasBody && options?.contentType !== 'none') {
      headers.set('Content-Type', options?.contentType || 'application/json')
    }

    if (options?.includeAuth !== false) {
      const token = this.getToken()
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
    }

    return headers
  }

  // Generic request handler
  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown
      params?: Record<string, string | number | boolean | undefined>
      includeAuth?: boolean
    },
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`

    // Add query params
    if (options?.params) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          searchParams.set(key, String(value))
        }
      }
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    const hasBody = options?.body !== undefined
    const headers = this.buildHeaders({ includeAuth: options?.includeAuth, hasBody })

    const fetchOptions: RequestInit = {
      method,
      headers,
    }

    if (hasBody) {
      fetchOptions.body = JSON.stringify(options.body)
    }

    const response = await fetch(url, fetchOptions)

    // Handle no content
    if (response.status === 204) {
      return {} as T
    }

    const data = await response.json()

    if (!response.ok) {
      const errorData = data as ApiError
      const error = new Error(errorData.error?.message || 'Request failed')
      ;(error as any).code = errorData.error?.code || 'UNKNOWN_ERROR'
      ;(error as any).status = response.status
      ;(error as any).details = errorData.error?.details
      throw error
    }

    // Return the data property from ApiResponse
    if (data.success && 'data' in data) {
      return (data as ApiResponse<T>).data
    }

    return data as T
  }
}

// Singleton instance
export const apiClient = new ApiClient(API_BASE_URL)

// Export class for testing
export { ApiClient }
