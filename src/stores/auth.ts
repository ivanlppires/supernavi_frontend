import type { User as ApiUser, UserSettings } from '@/api/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi, usersApi } from '@/api'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'pathologist' | 'technician'
  avatar?: string
  crm?: string
  specialization?: string
  createdAt: Date
}

// Transform API user to store user
function transformUser (apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role,
    avatar: apiUser.avatarUrl || undefined,
    crm: apiUser.crm || undefined,
    specialization: apiUser.specialization || undefined,
    createdAt: new Date(apiUser.createdAt),
  }
}

export const useAuthStore = defineStore('auth', () => {
  // Estado
  const user = ref<User | null>(null)
  const settings = ref<UserSettings | null>(null)
  const isLoading = ref(false)
  const isAuthenticated = ref(false)
  const error = ref<string | null>(null)

  // Getters computados
  const userName = computed(() => user.value?.name ?? '')
  const userInitials = computed(() => {
    if (!user.value?.name) {
      return ''
    }
    return user.value.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  })

  // Ações
  async function login (email: string, password: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.login({ email, password })
      user.value = transformUser(response.user)
      isAuthenticated.value = true

      // Cache user data for faster init
      localStorage.setItem('supernavi_user', JSON.stringify(user.value))

      // Fetch settings in background
      fetchSettings()

      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao fazer login'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function register (data: {
    name: string
    email: string
    password: string
    crm?: string
    specialization?: string
  }): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.register(data)
      user.value = transformUser(response.user)
      isAuthenticated.value = true

      // Cache user data
      localStorage.setItem('supernavi_user', JSON.stringify(user.value))

      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao criar conta'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function googleLogin (idToken: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.googleAuth({ idToken })
      user.value = transformUser(response.user)
      isAuthenticated.value = true
      localStorage.setItem('supernavi_user', JSON.stringify(user.value))
      fetchSettings()
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao fazer login com Google'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function appleLogin (idToken: string, name?: { firstName?: string, lastName?: string }): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.appleAuth({
        idToken,
        user: name ? { name } : undefined,
      })
      user.value = transformUser(response.user)
      isAuthenticated.value = true
      localStorage.setItem('supernavi_user', JSON.stringify(user.value))
      fetchSettings()
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao fazer login com Apple'
      return false
    } finally {
      isLoading.value = false
    }
  }

  function logout () {
    authApi.logout()
    user.value = null
    settings.value = null
    isAuthenticated.value = false
    localStorage.removeItem('supernavi_user')
  }

  async function fetchSettings () {
    try {
      settings.value = await usersApi.getSettings()
    } catch {
      // Settings are optional, don't fail
    }
  }

  async function updateSettings (data: Partial<UserSettings>): Promise<boolean> {
    try {
      settings.value = await usersApi.updateSettings(data)
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao atualizar configurações'
      return false
    }
  }

  async function updateProfile (data: {
    name?: string
    avatarUrl?: string | null
    crm?: string
    specialization?: string
  }): Promise<boolean> {
    try {
      const updated = await usersApi.updateMe(data)
      user.value = transformUser(updated)
      localStorage.setItem('supernavi_user', JSON.stringify(user.value))
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao atualizar perfil'
      return false
    }
  }

  async function initFromStorage (): Promise<boolean> {
    // First, check if we have a token
    if (!authApi.hasToken()) {
      return false
    }

    // Try to load cached user for immediate UI
    const stored = localStorage.getItem('supernavi_user')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        user.value = {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
        }
        isAuthenticated.value = true
      } catch {
        localStorage.removeItem('supernavi_user')
      }
    }

    // Validate token with API and get fresh user data
    try {
      const apiUser = await authApi.me()
      user.value = transformUser(apiUser)
      isAuthenticated.value = true
      localStorage.setItem('supernavi_user', JSON.stringify(user.value))

      // Fetch settings
      fetchSettings()

      return true
    } catch {
      // Token is invalid, clear everything
      logout()
      return false
    }
  }

  return {
    // Estado
    user,
    settings,
    isLoading,
    isAuthenticated,
    error,

    // Getters
    userName,
    userInitials,

    // Ações
    login,
    register,
    googleLogin,
    appleLogin,
    logout,
    updateProfile,
    updateSettings,
    fetchSettings,
    initFromStorage,
  }
})
