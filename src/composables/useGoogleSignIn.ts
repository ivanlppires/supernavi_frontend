/**
 * Google Identity Services (GIS) composable
 * Handles Google Sign-In initialization and token retrieval
 */

import { onMounted, ref } from 'vue'

// Google Identity Services types
interface CredentialResponse {
  credential: string
  select_by: string
  clientId?: string
}

interface GsiButtonConfiguration {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: number
  locale?: string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: CredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    context?: 'signin' | 'signup' | 'use'
    ux_mode?: 'popup' | 'redirect'
    itp_support?: boolean
  }) => void
  prompt: (notification?: (notification: { isNotDisplayed: () => boolean, isSkippedMoment: () => boolean }) => void) => void
  renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void
  disableAutoSelect: () => void
  revoke: (hint: string, callback: () => void) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId
      }
    }
  }
}

// Script loading state
let scriptLoadPromise: Promise<void> | null = null

/**
 * Load Google Identity Services script
 */
function loadGoogleScript (): Promise<void> {
  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  // Already loaded
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve())
    script.onerror = () => reject(new Error('Falha ao carregar Google Sign-In'))
    document.head.append(script)
  })

  return scriptLoadPromise
}

export function useGoogleSignIn () {
  const isReady = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Get client ID from environment
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

  // Callback resolver for signIn promise
  let signInResolver: ((credential: string) => void) | null = null
  let signInRejecter: ((error: Error) => void) | null = null

  /**
   * Handle credential response from Google
   */
  function handleCredentialResponse (response: CredentialResponse) {
    if (response.credential && signInResolver) {
      signInResolver(response.credential)
      signInResolver = null
      signInRejecter = null
    }
  }

  /**
   * Initialize Google Sign-In
   */
  async function initialize (): Promise<boolean> {
    if (!clientId) {
      error.value = 'VITE_GOOGLE_CLIENT_ID não configurado'
      console.error('Google Sign-In: VITE_GOOGLE_CLIENT_ID environment variable is not set')
      return false
    }

    try {
      isLoading.value = true
      await loadGoogleScript()

      if (!window.google?.accounts?.id) {
        throw new Error('Google Identity Services não carregou corretamente')
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
        ux_mode: 'popup',
        itp_support: true,
      })

      isReady.value = true
      return true
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : 'Erro ao inicializar Google Sign-In'
      console.error('Google Sign-In initialization error:', error_)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Trigger Google Sign-In popup and get ID token
   * Returns the ID token (JWT) that should be sent to the backend
   */
  async function signIn (): Promise<string> {
    if (!isReady.value) {
      const initialized = await initialize()
      if (!initialized) {
        throw new Error(error.value || 'Google Sign-In não está disponível')
      }
    }

    isLoading.value = true
    error.value = null

    return new Promise((resolve, reject) => {
      signInResolver = resolve
      signInRejecter = reject

      // Use prompt() to show One Tap or fallback
      window.google!.accounts.id.prompt(notification => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap not available, create and click a hidden button
          const container = document.createElement('div')
          container.style.position = 'fixed'
          container.style.top = '50%'
          container.style.left = '50%'
          container.style.transform = 'translate(-50%, -50%)'
          container.style.zIndex = '10000'
          container.style.background = 'white'
          container.style.padding = '20px'
          container.style.borderRadius = '8px'
          container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'
          document.body.append(container)

          window.google!.accounts.id.renderButton(container, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: 300,
          })

          // Add close button
          const closeBtn = document.createElement('button')
          closeBtn.innerHTML = '&times;'
          closeBtn.style.cssText = 'position:absolute;top:5px;right:10px;background:none;border:none;font-size:24px;cursor:pointer;color:#666;'
          closeBtn.addEventListener('click', () => {
            container.remove()
            isLoading.value = false
            reject(new Error('Login cancelado'))
          })
          container.append(closeBtn)

          // Listen for credential response
          const checkCredential = setInterval(() => {
            if (!signInResolver) {
              clearInterval(checkCredential)
              if (document.body.contains(container)) {
                container.remove()
              }
              isLoading.value = false
            }
          }, 100)

          // Override resolver to also cleanup
          const originalResolver = signInResolver
          signInResolver = (credential: string) => {
            clearInterval(checkCredential)
            if (document.body.contains(container)) {
              container.remove()
            }
            isLoading.value = false
            originalResolver?.(credential)
          }
        }
      })

      // Timeout after 2 minutes
      setTimeout(() => {
        if (signInRejecter) {
          isLoading.value = false
          signInRejecter(new Error('Tempo limite excedido'))
          signInResolver = null
          signInRejecter = null
        }
      }, 120_000)
    })
  }

  /**
   * Render Google Sign-In button in a container element
   */
  function renderButton (container: HTMLElement, options?: GsiButtonConfiguration) {
    if (!isReady.value || !window.google?.accounts?.id) {
      console.error('Google Sign-In not ready. Call initialize() first.')
      return
    }

    window.google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      ...options,
    })
  }

  /**
   * Revoke access (logout from Google perspective)
   */
  function revoke (email: string): Promise<void> {
    return new Promise(resolve => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.revoke(email, () => {
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  // Auto-initialize on mount if in browser
  onMounted(() => {
    if (clientId) {
      initialize()
    }
  })

  return {
    isReady,
    isLoading,
    error,
    initialize,
    signIn,
    renderButton,
    revoke,
  }
}
