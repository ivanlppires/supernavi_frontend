import type { Notification } from '@/api/types'
import { computed, ref } from 'vue'
import { notificationsApi } from '@/api'

// Singleton state
const notifications = ref<Notification[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const lastFetch = ref<number>(0)

// Cache duration: 30 seconds
const CACHE_DURATION = 30 * 1000

export function useNotifications () {
  // Fetch notifications
  async function fetchNotifications (options?: {
    unreadOnly?: boolean
    forceRefresh?: boolean
  }): Promise<void> {
    const now = Date.now()
    if (!options?.forceRefresh && now - lastFetch.value < CACHE_DURATION && notifications.value.length > 0) {
      return
    }

    isLoading.value = true
    error.value = null

    try {
      notifications.value = await notificationsApi.list({
        unreadOnly: options?.unreadOnly,
        limit: 50,
      })
      lastFetch.value = now
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao carregar notificações'
    } finally {
      isLoading.value = false
    }
  }

  // Mark notification as read
  async function markAsRead (id: string): Promise<boolean> {
    try {
      await notificationsApi.markAsRead(id)
      const notification = notifications.value.find(n => n.id === id)
      if (notification) {
        notification.isRead = true
      }
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao marcar como lida'
      return false
    }
  }

  // Mark all as read
  async function markAllAsRead (): Promise<boolean> {
    try {
      await notificationsApi.markAllAsRead()
      for (const n of notifications.value) {
        n.isRead = true
      }
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao marcar todas como lidas'
      return false
    }
  }

  // Delete notification
  async function deleteNotification (id: string): Promise<boolean> {
    try {
      await notificationsApi.delete(id)
      const index = notifications.value.findIndex(n => n.id === id)
      if (index !== -1) {
        notifications.value.splice(index, 1)
      }
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao excluir notificação'
      return false
    }
  }

  // Computed: unread count
  const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length)

  // Computed: grouped by type
  const invitations = computed(() =>
    notifications.value.filter(n => n.type === 'invitation' && !n.isRead),
  )

  const messages = computed(() =>
    notifications.value.filter(n => n.type === 'message' && !n.isRead),
  )

  const caseUpdates = computed(() =>
    notifications.value.filter(n => n.type === 'case_update' && !n.isRead),
  )

  // Clear cache
  function clearCache () {
    notifications.value = []
    lastFetch.value = 0
    error.value = null
  }

  return {
    // State
    notifications,
    isLoading,
    error,

    // Methods
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearCache,

    // Computed
    unreadCount,
    invitations,
    messages,
    caseUpdates,
  }
}
