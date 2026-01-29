<template>
  <div class="dashboard">
    <!-- Header (same as dashboard) -->
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
          <h1 class="page-title">Relatórios</h1>
        </div>
        <div class="page-header-right">
          <v-select
            v-model="period"
            class="period-select"
            density="compact"
            hide-details
            item-title="label"
            item-value="value"
            :items="periodOptions"
            variant="outlined"
          />
          <v-btn
            color="primary"
            :loading="isGeneratingPDF"
            prepend-icon="mdi-file-pdf-box"
            variant="tonal"
            @click="downloadPDF"
          >
            Baixar PDF
          </v-btn>
        </div>
      </div>

      <!-- Stats Cards -->
      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon primary">
            <v-icon>mdi-folder-multiple</v-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.totalCases }}</span>
            <span class="stat-label">Total de Casos</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon success">
            <v-icon>mdi-check-circle</v-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.completed }}</span>
            <span class="stat-label">Concluídos</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon info">
            <v-icon>mdi-progress-clock</v-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.inProgress }}</span>
            <span class="stat-label">Em Análise</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon warning">
            <v-icon>mdi-account-group</v-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.collaborations }}</span>
            <span class="stat-label">Colaborações</span>
          </div>
        </div>
      </section>

      <!-- Summary -->
      <section class="summary-section">
        <h2 class="section-title">Resumo por Status</h2>
        <div class="summary-list">
          <div v-for="item in statusSummary" :key="item.status" class="summary-item">
            <div class="summary-left">
              <span class="summary-dot" :style="{ background: item.color }" />
              <span class="summary-label">{{ item.label }}</span>
            </div>
            <div class="summary-right">
              <span class="summary-count">{{ item.count }}</span>
              <span class="summary-percent">{{ item.percent }}%</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Activity -->
      <section class="activity-section">
        <h2 class="section-title">Atividade Recente</h2>
        <div class="activity-list">
          <div v-for="activity in recentActivity" :key="activity.id" class="activity-item">
            <v-icon :color="activity.color" size="18">{{ activity.icon }}</v-icon>
            <div class="activity-content">
              <span class="activity-text">{{ activity.text }}</span>
              <span class="activity-time">{{ activity.time }}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
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

  const period = ref('month')
  const periodOptions = [
    { label: 'Esta semana', value: 'week' },
    { label: 'Este mês', value: 'month' },
    { label: 'Este ano', value: 'year' },
    { label: 'Todo período', value: 'all' },
  ]

  const isGeneratingPDF = ref(false)

  // Mock stats
  const stats = computed(() => ({
    totalCases: 24,
    completed: 15,
    inProgress: 6,
    collaborations: 8,
  }))

  const statusSummary = computed(() => {
    const total = stats.value.totalCases || 1
    return [
      { status: 'completed', label: 'Concluídos', count: 15, percent: Math.round((15 / total) * 100), color: '#4CAF50' },
      { status: 'in_progress', label: 'Em Análise', count: 6, percent: Math.round((6 / total) * 100), color: '#2196F3' },
      { status: 'new', label: 'Novos', count: 3, percent: Math.round((3 / total) * 100), color: '#FF9800' },
    ]
  })

  const recentActivity = ref([
    { id: 1, icon: 'mdi-check', color: 'success', text: 'Caso CASE-2024-001 concluído', time: 'Hoje, 14:30' },
    { id: 2, icon: 'mdi-account-plus', color: 'info', text: 'Nova colaboração em CASE-2024-004', time: 'Hoje, 10:15' },
    { id: 3, icon: 'mdi-folder-plus', color: 'warning', text: 'Novo caso CASE-2024-007 criado', time: 'Ontem, 16:45' },
    { id: 4, icon: 'mdi-check', color: 'success', text: 'Caso CASE-2024-003 concluído', time: 'Ontem, 11:20' },
    { id: 5, icon: 'mdi-message', color: 'secondary', text: 'Comentário em CASE-2024-002', time: '2 dias atrás' },
  ])

  function goToDashboard () {
    router.push('/dashboard')
  }

  function handleLogout () {
    authStore.logout()
    router.push('/')
  }

  function getPeriodLabel () {
    const option = periodOptions.find(o => o.value === period.value)
    return option?.label || 'Este mês'
  }

  function downloadPDF () {
    isGeneratingPDF.value = true

    // Generate PDF content
    const periodLabel = getPeriodLabel()
    const date = new Date().toLocaleDateString('pt-BR')
    const userName = authStore.user?.name || 'Usuário'

    const content = `
SUPERNAVI - RELATÓRIO GERAL
==========================================
Gerado em: ${date}
Período: ${periodLabel}
Usuário: ${userName}

RESUMO ESTATÍSTICO
------------------------------------------
Total de Casos: ${stats.value.totalCases}
Casos Concluídos: ${stats.value.completed}
Casos em Análise: ${stats.value.inProgress}
Colaborações: ${stats.value.collaborations}

DISTRIBUIÇÃO POR STATUS
------------------------------------------
${statusSummary.value.map(s => `${s.label}: ${s.count} (${s.percent}%)`).join('\n')}

ATIVIDADE RECENTE
------------------------------------------
${recentActivity.value.map(a => `• ${a.text} - ${a.time}`).join('\n')}

==========================================
SuperNavi - Plataforma de Patologia Digital
    `.trim()

    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-supernavi-${new Date().toISOString().split('T')[0]}.txt`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setTimeout(() => {
      isGeneratingPDF.value = false
    }, 500)
  }

  onMounted(async () => {
    const isValid = await authStore.initFromStorage()
    if (!isValid) {
      // Not authenticated, redirect to login
      router.push('/')
    }
  })
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
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px;
}

// Page Header
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}

.period-select {
  width: 160px;
}

// Stats Grid
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;

  &.primary {
    background: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
  }

  &.success {
    background: rgba(76, 175, 80, 0.12);
    color: #4CAF50;
  }

  &.info {
    background: rgba(33, 150, 243, 0.12);
    color: #2196F3;
  }

  &.warning {
    background: rgba(255, 152, 0, 0.12);
    color: #FF9800;
  }
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1;
}

.stat-label {
  font-size: 0.8rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 4px;
}

// Section
.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0 0 16px;
}

// Summary
.summary-section {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.summary-label {
  font-size: 0.9rem;
  color: rgb(var(--v-theme-on-surface));
}

.summary-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-count {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.summary-percent {
  font-size: 0.8rem;
  color: rgb(var(--v-theme-on-surface-variant));
  min-width: 40px;
  text-align: right;
}

// Activity
.activity-section {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 20px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.activity-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.activity-text {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
}

.activity-time {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 2px;
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

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-header-right {
    width: 100%;
    justify-content: space-between;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .period-select {
    width: 140px;
  }
}
</style>
