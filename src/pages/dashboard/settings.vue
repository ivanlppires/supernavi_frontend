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
          <h1 class="page-title">Configurações</h1>
        </div>
      </div>

      <!-- Settings Sections -->
      <div class="settings-list">
        <!-- Appearance -->
        <section class="settings-section">
          <h2 class="section-title">Aparência</h2>

          <div class="setting-item">
            <div class="setting-info">
              <v-icon class="setting-icon">mdi-theme-light-dark</v-icon>
              <div class="setting-text">
                <span class="setting-label">Tema</span>
                <span class="setting-description">Escolha entre tema claro ou escuro</span>
              </div>
            </div>
            <v-btn-toggle
              v-model="settings.theme"
              color="primary"
              density="compact"
              mandatory
              variant="outlined"
              @update:model-value="onThemeChange"
            >
              <v-btn size="small" value="light">
                <v-icon size="18">mdi-weather-sunny</v-icon>
              </v-btn>
              <v-btn size="small" value="dark">
                <v-icon size="18">mdi-weather-night</v-icon>
              </v-btn>
            </v-btn-toggle>
          </div>
        </section>

        <!-- Notifications -->
        <section class="settings-section">
          <h2 class="section-title">Notificações</h2>

          <div class="setting-item">
            <div class="setting-info">
              <v-icon class="setting-icon">mdi-bell-outline</v-icon>
              <div class="setting-text">
                <span class="setting-label">Notificações push</span>
                <span class="setting-description">Receber alertas de novos casos e colaborações</span>
              </div>
            </div>
            <v-switch
              v-model="settings.pushNotifications"
              color="primary"
              hide-details
              inset
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <v-icon class="setting-icon">mdi-email-outline</v-icon>
              <div class="setting-text">
                <span class="setting-label">Notificações por e-mail</span>
                <span class="setting-description">Receber resumo diário por e-mail</span>
              </div>
            </div>
            <v-switch
              v-model="settings.emailNotifications"
              color="primary"
              hide-details
              inset
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <v-icon class="setting-icon">mdi-volume-high</v-icon>
              <div class="setting-text">
                <span class="setting-label">Sons</span>
                <span class="setting-description">Reproduzir sons para notificações</span>
              </div>
            </div>
            <v-switch
              v-model="settings.soundEnabled"
              color="primary"
              hide-details
              inset
            />
          </div>
        </section>

        <!-- Privacy -->
        <section class="settings-section">
          <h2 class="section-title">Privacidade</h2>

          <div class="setting-item">
            <div class="setting-info">
              <v-icon class="setting-icon">mdi-eye-outline</v-icon>
              <div class="setting-text">
                <span class="setting-label">Mostrar status online</span>
                <span class="setting-description">Permitir que outros vejam quando você está online</span>
              </div>
            </div>
            <v-switch
              v-model="settings.showOnlineStatus"
              color="primary"
              hide-details
              inset
            />
          </div>
        </section>

        <!-- Data -->
        <section class="settings-section">
          <h2 class="section-title">Dados</h2>

          <div class="setting-item clickable" @click="exportData">
            <div class="setting-info">
              <v-icon class="setting-icon">mdi-download</v-icon>
              <div class="setting-text">
                <span class="setting-label">Exportar meus dados</span>
                <span class="setting-description">Baixar todos os seus dados em formato JSON</span>
              </div>
            </div>
            <v-icon color="on-surface-variant">mdi-chevron-right</v-icon>
          </div>

          <div class="setting-item clickable danger" @click="showClearDataDialog = true">
            <div class="setting-info">
              <v-icon class="setting-icon">mdi-delete-outline</v-icon>
              <div class="setting-text">
                <span class="setting-label">Limpar dados locais</span>
                <span class="setting-description">Remover cache e preferências salvas</span>
              </div>
            </div>
            <v-icon color="error">mdi-chevron-right</v-icon>
          </div>
        </section>

        <!-- About -->
        <section class="settings-section">
          <h2 class="section-title">Sobre</h2>

          <div class="setting-item">
            <div class="setting-info">
              <v-icon class="setting-icon">mdi-information-outline</v-icon>
              <div class="setting-text">
                <span class="setting-label">Versão</span>
                <span class="setting-description">SuperNavi v2.0.0</span>
              </div>
            </div>
          </div>

          <div class="setting-item clickable" @click="openSupport">
            <div class="setting-info">
              <v-icon class="setting-icon">mdi-help-circle-outline</v-icon>
              <div class="setting-text">
                <span class="setting-label">Suporte</span>
                <span class="setting-description">Obter ajuda ou reportar problemas</span>
              </div>
            </div>
            <v-icon color="on-surface-variant">mdi-chevron-right</v-icon>
          </div>
        </section>
      </div>
    </main>

    <!-- Clear Data Dialog -->
    <v-dialog v-model="showClearDataDialog" max-width="400">
      <v-card>
        <v-card-title>Limpar dados locais?</v-card-title>
        <v-card-text>
          Isso irá remover todas as preferências salvas e cache local. Você precisará fazer login novamente.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showClearDataDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="tonal" @click="clearData">Limpar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTheme } from 'vuetify'
  import { useAuthStore } from '@/stores/auth'

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

  // Settings
  const settings = ref({
    theme: isDark.value ? 'dark' : 'light',
    pushNotifications: true,
    emailNotifications: false,
    soundEnabled: true,
    showOnlineStatus: true,
  })

  const showClearDataDialog = ref(false)

  // Load settings from localStorage and API
  onMounted(async () => {
    const isValid = await authStore.initFromStorage()
    if (!isValid) {
      // Not authenticated, redirect to login
      router.push('/')
      return
    }

    // Load settings from API if available
    if (authStore.settings) {
      settings.value = {
        ...settings.value,
        theme: authStore.settings.theme,
        pushNotifications: authStore.settings.pushNotifications,
        emailNotifications: authStore.settings.emailNotifications,
        soundEnabled: authStore.settings.soundEnabled,
        showOnlineStatus: authStore.settings.showOnlineStatus,
      }
    }
    // Sync theme with current state
    settings.value.theme = isDark.value ? 'dark' : 'light'
  })

  // Save settings when they change
  watch(settings, newSettings => {
    localStorage.setItem('supernavi_settings', JSON.stringify(newSettings))
  }, { deep: true })

  function onThemeChange (value: string) {
    theme.global.name.value = value === 'dark' ? 'medicalDark' : 'medicalLight'
  }

  function goToDashboard () {
    router.push('/dashboard')
  }

  function handleLogout () {
    authStore.logout()
    router.push('/')
  }

  function exportData () {
    const data = {
      user: authStore.user,
      settings: settings.value,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `supernavi-dados-${new Date().toISOString().split('T')[0]}.json`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function clearData () {
    localStorage.removeItem('supernavi_settings')
    localStorage.removeItem('supernavi_user')
    showClearDataDialog.value = false
    router.push('/')
  }

  function openSupport () {
    window.open('mailto:suporte@supernavi.com.br', '_blank')
  }
</script>

<style scoped lang="scss">
.dashboard {
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}

// Header
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

// Settings
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

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

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  gap: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));

  &:first-of-type {
    border-top: none;
  }

  &.clickable {
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.04);
    }
  }

  &.danger {
    .setting-label {
      color: rgb(var(--v-theme-error));
    }

    .setting-icon {
      color: rgb(var(--v-theme-error));
    }
  }
}

.setting-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.setting-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  flex-shrink: 0;
}

.setting-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.setting-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.setting-description {
  font-size: 0.8rem;
  color: rgb(var(--v-theme-on-surface-variant));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

  .setting-description {
    white-space: normal;
  }
}
</style>
