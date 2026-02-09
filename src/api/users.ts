import type { User, UserSettings } from './types'
import { apiClient } from './client'

export const usersApi = {
  /**
   * Get current user profile
   */
  async getMe (): Promise<User> {
    return apiClient.get<User>('/users/me')
  },

  /**
   * Update current user profile
   */
  async updateMe (data: {
    name?: string
    avatarUrl?: string | null
    crm?: string
    specialization?: string
  }): Promise<User> {
    return apiClient.patch<User>('/users/me', data)
  },

  /**
   * Get user settings
   */
  async getSettings (): Promise<UserSettings> {
    return apiClient.get<UserSettings>('/users/me/settings')
  },

  /**
   * Update user settings
   */
  async updateSettings (data: Partial<UserSettings>): Promise<UserSettings> {
    return apiClient.patch<UserSettings>('/users/me/settings', data)
  },

  /**
   * Get public profile of another user
   */
  async getUser (id: string): Promise<User> {
    return apiClient.get<User>(`/users/${id}`)
  },

  /**
   * Search users by email or name (for collaboration invites)
   */
  async search (query: string): Promise<Array<{
    id: string
    email: string
    name: string
    avatarUrl: string | null
    specialization: string | null
  }>> {
    if (!query || query.length < 2) return []
    return apiClient.get(`/users/search?q=${encodeURIComponent(query)}`)
  },
}
