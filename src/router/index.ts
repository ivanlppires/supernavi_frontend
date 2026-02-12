/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

import { setupLayouts } from 'virtual:generated-layouts'
// Composables
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(routes),
})

// Protected routes that require authentication
const protectedRoutes = ['/dashboard', '/viewer', '/pair']

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Check if route requires authentication
  const requiresAuth = protectedRoutes.some(route =>
    to.path === route || to.path.startsWith(`${route}/`),
  )

  if (requiresAuth) {
    // Allow magic link access to viewer (skip auth when ?t= token present)
    if (to.path === '/viewer' && to.query.t) {
      return next()
    }

    // Try to restore session from storage if not authenticated
    if (!authStore.isAuthenticated) {
      await authStore.initFromStorage()
    }

    // If still not authenticated, redirect to home
    if (!authStore.isAuthenticated) {
      return next({ path: '/', query: { redirect: to.fullPath } })
    }
  }

  next()
})

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (localStorage.getItem('vuetify:dynamic-reload')) {
      console.error('Dynamic import error, reloading page did not fix it', err)
    } else {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    }
  } else {
    console.error(err)
  }
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})

export default router
