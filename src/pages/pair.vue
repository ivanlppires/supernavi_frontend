<template>
  <div class="dashboard">
    <!-- Header -->
    <header class="dashboard-header">
      <div class="brand">
        <img alt="SuperNavi" class="brand-logo" src="/images/logosupernavi.png">
        <span class="brand-name"><span class="super">Super</span><span class="navi">Navi</span></span>
      </div>

      <div class="header-actions">
        <v-btn
          icon
          size="small"
          variant="text"
          @click="toggleTheme"
        >
          <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
        </v-btn>

        <v-menu location="bottom end" offset="8">
          <template #activator="{ props }">
            <button v-bind="props" class="user-btn">
              <v-avatar color="primary" size="32">
                <v-img v-if="authStore.user?.avatar" cover :src="authStore.user.avatar" />
                <span v-else class="text-caption font-weight-bold">{{ authStore.userInitials }}</span>
              </v-avatar>
              <span class="user-name">{{ authStore.userName }}</span>
              <v-icon size="16">mdi-chevron-down</v-icon>
            </button>
          </template>

          <v-card class="user-menu" min-width="200">
            <v-list density="compact">
              <v-list-item prepend-icon="mdi-view-dashboard-outline" title="Dashboard" @click="goToDashboard" />
              <v-divider class="my-1" />
              <v-list-item
                class="text-error"
                prepend-icon="mdi-logout"
                title="Sair"
                @click="handleLogout"
              />
            </v-list>
          </v-card>
        </v-menu>
      </div>
    </header>

    <!-- Main Content -->
    <main class="dashboard-main">
      <!-- Page Header -->
      <div class="page-header">
        <div class="page-header-left">
          <v-btn icon size="small" variant="text" @click="goToDashboard">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <h1 class="page-title">Parear Extensao</h1>
        </div>
      </div>

        <!-- Generate Code Section -->
        <div class="settings-section mb-6">
          <h3 class="section-title">Gerar Codigo de Pareamento</h3>

          <div class="section-body">
            <p class="section-description">
              Gere um codigo de 6 caracteres para parear a extensao Chrome com o SuperNavi.
              O codigo expira em 10 minutos.
            </p>

            <v-btn
              color="primary"
              :loading="generating"
              @click="generateCode"
            >
              <v-icon start>mdi-key-plus</v-icon>
              Gerar Codigo
            </v-btn>

            <!-- Code Display -->
            <div v-if="pairingCode" class="code-display mt-4">
              <div class="code-value">{{ pairingCode }}</div>
              <v-btn
                class="copy-btn mt-2"
                :color="copied ? 'success' : 'primary'"
                size="small"
                variant="tonal"
                @click="copyCode"
              >
                <v-icon start size="16">{{ copied ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
                {{ copied ? 'Copiado!' : 'Copiar codigo' }}
              </v-btn>
              <div class="code-meta">
                <span v-if="countdown > 0" class="code-countdown">
                  Expira em {{ formatCountdown(countdown) }}
                </span>
                <span v-else class="code-expired">Codigo expirado</span>
              </div>

              <!-- QR Code -->
              <div v-if="qrPayload && countdown > 0" class="qr-container mt-3">
                <img
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrPayload)}`"
                  alt="QR Code"
                  class="qr-image"
                  width="160"
                  height="160"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Devices List Section -->
        <div class="settings-section">
          <h3 class="section-title">Dispositivos Pareados</h3>

          <div v-if="loadingDevices" class="section-body text-center">
            <v-progress-circular indeterminate size="24" />
          </div>

          <div v-else-if="devices.length === 0" class="section-body">
            <p class="text-medium-emphasis">Nenhum dispositivo pareado ainda.</p>
          </div>

          <template v-else>
            <div
              v-for="device in devices"
              :key="device.id"
              class="device-item"
            >
              <div class="device-info">
                <v-icon class="device-icon" :color="device.isActive ? 'success' : 'error'">
                  {{ device.isActive ? 'mdi-monitor-check' : 'mdi-monitor-off' }}
                </v-icon>
                <div class="device-text">
                  <span class="device-name">{{ device.name }}</span>
                  <span class="device-meta">
                    Criado {{ formatDate(device.createdAt) }}
                    <template v-if="device.lastSeenAt">
                      &middot; Visto {{ formatDate(device.lastSeenAt) }}
                    </template>
                  </span>
                </div>
              </div>

              <v-chip
                v-if="!device.isActive"
                color="error"
                size="small"
                variant="tonal"
              >
                Revogado
              </v-chip>
              <v-btn
                v-else
                color="error"
                size="small"
                variant="text"
                :loading="revokingId === device.id"
                @click="revokeDevice(device.id)"
              >
                Revogar
              </v-btn>
            </div>
          </template>
        </div>
    </main>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, onUnmounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTheme } from 'vuetify'
  import { useAuthStore } from '@/stores/auth'
  import { apiClient } from '@/api/client'

  definePage({
    meta: { layout: 'blank' },
  })

  const router = useRouter()
  const theme = useTheme()
  const authStore = useAuthStore()

  // Theme
  const isDark = computed(() => theme.global.current.value.dark)
  function toggleTheme () {
    theme.global.name.value = isDark.value ? 'medicalLight' : 'medicalDark'
  }

  // Pairing code
  const generating = ref(false)
  const pairingCode = ref('')
  const qrPayload = ref('')
  const countdown = ref(0)
  const copied = ref(false)
  let countdownTimer: ReturnType<typeof setInterval> | null = null

  async function copyCode () {
    try {
      await navigator.clipboard.writeText(pairingCode.value)
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = pairingCode.value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    }
  }

  // Devices
  const devices = ref<Array<{
    id: string
    name: string
    createdAt: string
    revokedAt: string | null
    lastSeenAt: string | null
    isActive: boolean
  }>>([])
  const loadingDevices = ref(false)
  const revokingId = ref<string | null>(null)

  function formatCountdown (seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function formatDate (iso: string): string {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'agora'
    if (diffMin < 60) return `${diffMin}min atras`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h atras`
    return d.toLocaleDateString('pt-BR')
  }

  async function generateCode () {
    generating.value = true
    try {
      const res = await apiClient.post<{
        code: string
        expiresAt: string
        expiresInSeconds: number
        qrPayload: string
      }>('/ui-bridge/pairing/start', {})

      pairingCode.value = res.code
      qrPayload.value = res.qrPayload
      countdown.value = res.expiresInSeconds

      // Start countdown
      if (countdownTimer) clearInterval(countdownTimer)
      countdownTimer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          if (countdownTimer) clearInterval(countdownTimer)
          countdownTimer = null
        }
      }, 1000)
    } catch (err) {
      console.error('Failed to generate pairing code:', err)
    } finally {
      generating.value = false
    }
  }

  async function loadDevices () {
    loadingDevices.value = true
    try {
      devices.value = await apiClient.get<typeof devices.value>('/ui-bridge/pairing/devices')
    } catch (err) {
      console.error('Failed to load devices:', err)
    } finally {
      loadingDevices.value = false
    }
  }

  async function revokeDevice (deviceId: string) {
    revokingId.value = deviceId
    try {
      await apiClient.post('/ui-bridge/pairing/revoke', { deviceId })
      // Refresh list
      await loadDevices()
    } catch (err) {
      console.error('Failed to revoke device:', err)
    } finally {
      revokingId.value = null
    }
  }

  function goToDashboard () {
    router.push('/dashboard')
  }

  function handleLogout () {
    authStore.logout()
    router.push('/')
  }

  onMounted(async () => {
    const isValid = await authStore.initFromStorage()
    if (!isValid) {
      router.push('/')
      return
    }
    await loadDevices()
  })

  onUnmounted(() => {
    if (countdownTimer) clearInterval(countdownTimer)
  })
</script>

<style scoped lang="scss">
.dashboard {
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}

// Header (same as settings)
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.brand-name {
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 1.25rem;

  .super {
    font-weight: 400;
    color: rgb(var(--v-theme-on-surface));
  }

  .navi {
    font-weight: 700;
    color: rgb(var(--v-theme-primary));
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  background: transparent;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.04);
  }
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

// Main
.dashboard-main {
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 24px;
}

// Page Header
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}

// Settings section
.settings-section {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(var(--v-theme-on-surface-variant));
  padding: 16px 16px 8px;
  margin: 0;
}

.section-body {
  padding: 12px 16px 16px;
}

.section-description {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 16px;
  line-height: 1.5;
}

// Code display
.code-display {
  text-align: center;
}

.code-value {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
  border-radius: 12px;
  padding: 16px 24px;
  user-select: all;
}

.code-meta {
  margin-top: 8px;
  font-size: 0.875rem;
}

.code-countdown {
  color: rgb(var(--v-theme-on-surface-variant));
}

.code-expired {
  color: rgb(var(--v-theme-error));
  font-weight: 500;
}

.qr-container {
  display: flex;
  justify-content: center;
}

.qr-image {
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

// Devices
.device-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  gap: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.device-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.device-icon {
  flex-shrink: 0;
}

.device-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.device-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.device-meta {
  font-size: 0.8rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

// Responsive
@media (max-width: 600px) {
  .dashboard-header {
    padding: 12px 16px;
  }

  .user-name {
    display: none;
  }

  .dashboard-main {
    padding: 24px 16px;
  }

  .code-value {
    font-size: 1.75rem;
    letter-spacing: 0.2em;
    padding: 12px 16px;
  }
}
</style>
