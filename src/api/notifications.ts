import type { Notification, NotificationsListParams } from './types'
import { apiClient } from './client'

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

export const notificationsApi = {
  /**
   * List notifications
   */
  async list (params?: NotificationsListParams): Promise<Notification[]> {
    const response = await apiClient.get<NotificationsResponse>('/notifications', params as Record<string, string | number | boolean | undefined>)
    return response.notifications || []
  },

  /**
   * Mark notification as read
   */
  async markAsRead (id: string): Promise<void> {
    return apiClient.patch<void>(`/notifications/${id}/read`, {})
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead (): Promise<void> {
    return apiClient.post<void>('/notifications/read-all')
  },

  /**
   * Delete a notification
   */
  async delete (id: string): Promise<void> {
    return apiClient.delete<void>(`/notifications/${id}`)
  },
}
