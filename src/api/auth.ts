import type {
  AuthResponse,
  LoginRequest,
  OAuthRequest,
  RegisterRequest,
  User,
} from './types'
import { apiClient } from './client'

export const authApi = {
  /**
   * Login with email and password
   */
  async login (credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.postPublic<AuthResponse>('/auth/login', credentials)
    // Store token
    apiClient.setToken(response.accessToken)
    return response
  },

  /**
   * Register a new user
   */
  async register (data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.postPublic<AuthResponse>('/auth/register', data)
    // Store token
    apiClient.setToken(response.accessToken)
    return response
  },

  /**
   * Get current authenticated user
   */
  async me (): Promise<User> {
    return apiClient.get<User>('/auth/me')
  },

  /**
   * Check OAuth providers availability
   */
  async oauthStatus (): Promise<{ google: boolean, apple: boolean }> {
    return apiClient.getPublic<{ google: boolean, apple: boolean }>('/auth/oauth/status')
  },

  /**
   * Login/register with Google OAuth
   */
  async googleAuth (data: OAuthRequest): Promise<AuthResponse> {
    const response = await apiClient.postPublic<AuthResponse>('/auth/google', data)
    apiClient.setToken(response.accessToken)
    return response
  },

  /**
   * Login/register with Apple OAuth
   */
  async appleAuth (data: OAuthRequest): Promise<AuthResponse> {
    const response = await apiClient.postPublic<AuthResponse>('/auth/apple', data)
    apiClient.setToken(response.accessToken)
    return response
  },

  /**
   * Logout - clears stored token
   */
  logout (): void {
    apiClient.clearToken()
  },

  /**
   * Check if user has a stored token
   */
  hasToken (): boolean {
    return !!apiClient.getToken()
  },
}
