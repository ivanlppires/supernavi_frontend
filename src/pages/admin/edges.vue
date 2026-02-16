<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div class="brand">
        <img alt="SuperNavi" class="brand-logo" src="/images/logosupernavi.png">
        <span class="brand-name"><span class="super">Super</span><span class="navi">Navi</span></span>
      </div>

      <div class="header-actions">
        <v-btn icon size="small" variant="text" @click="goToDashboard">
          <v-icon>mdi-view-dashboard-outline</v-icon>
        </v-btn>
      </div>
    </header>

    <main class="dashboard-main">
      <div class="page-header">
        <div class="page-header-left">
          <v-btn icon size="small" variant="text" @click="goToDashboard">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <h1 class="page-title">Gerenciar Edges</h1>
        </div>
      </div>

      <!-- Not admin -->
      <div v-if="authStore.user && authStore.user.role !== 'admin'" class="not-admin">
        <v-icon color="error" size="48">mdi-shield-lock-outline</v-icon>
        <p>Acesso restrito a administradores.</p>
      </div>

      <template v-else-if="authStore.user">
        <!-- Add new association -->
        <section class="settings-section">
          <h2 class="section-title">Vincular cliente a um edge</h2>

          <div class="form-row">
            <v-text-field
              v-model="newEmail"
              density="compact"
              hide-details
              label="E-mail do cliente"
              placeholder="patologista@email.com"
              prepend-inner-icon="mdi-email-outline"
              type="email"
              variant="outlined"
            />
            <v-text-field
              v-model="newEdgeId"
              density="compact"
              hide-details
              label="Edge ID"
              placeholder="ex: MAC01"
              prepend-inner-icon="mdi-server-outline"
              variant="outlined"
            />
            <v-btn
              color="primary"
              :disabled="!newEmail || !newEdgeId"
              :loading="adding"
              @click="addAssociation"
            >
              Vincular
            </v-btn>
          </div>

          <v-alert
            v-if="formMessage"
            class="mt-3"
            closable
            density="compact"
            :type="formMessageType"
            @click:close="formMessage = ''"
          >
            {{ formMessage }}
          </v-alert>
        </section>

        <!-- Known edges -->
        <section v-if="knownEdges.length > 0" class="settings-section mt-4">
          <h2 class="section-title">Edges conhecidos</h2>
          <div v-for="edge in knownEdges" :key="edge.edgeId" class="edge-item">
            <div class="edge-info">
              <v-icon color="success" size="18">mdi-server</v-icon>
              <span class="edge-id">{{ edge.edgeId }}</span>
            </div>
            <div class="edge-stats">
              <v-chip density="compact" size="small" variant="tonal">
                {{ edge.slideCount }} laminas
              </v-chip>
              <v-chip density="compact" size="small" variant="tonal">
                {{ edge.userCount }} usuarios
              </v-chip>
            </div>
          </div>
        </section>

        <!-- Existing associations -->
        <section class="settings-section mt-4">
          <h2 class="section-title">Vinculos ativos e pendentes</h2>

          <div v-if="loading" class="text-center pa-4">
            <v-progress-circular indeterminate size="24" />
          </div>

          <div v-else-if="associations.length === 0" class="empty-state">
            <v-icon color="on-surface-variant" size="32">mdi-link-variant-off</v-icon>
            <p>Nenhum vinculo configurado.</p>
          </div>

          <div v-else>
            <div v-for="assoc in associations" :key="assoc.id" class="assoc-item">
              <div class="assoc-info">
                <v-avatar :color="assoc.status === 'active' ? 'success' : 'warning'" size="32">
                  <v-icon color="white" size="18">
                    {{ assoc.status === 'active' ? 'mdi-check' : 'mdi-clock-outline' }}
                  </v-icon>
                </v-avatar>
                <div class="assoc-text">
                  <span class="assoc-email">{{ assoc.user?.name || assoc.email }}</span>
                  <span class="assoc-detail">
                    {{ assoc.email }} &middot; {{ assoc.edgeId }}
                    <v-chip
                      class="ml-1"
                      :color="assoc.status === 'active' ? 'success' : 'warning'"
                      density="compact"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ assoc.status === 'active' ? 'Ativo' : 'Pendente' }}
                    </v-chip>
                  </span>
                </div>
              </div>
              <v-btn
                color="error"
                icon
                :loading="deleting === assoc.id"
                size="small"
                variant="text"
                @click="removeAssociation(assoc.id)"
              >
                <v-icon size="18">mdi-delete-outline</v-icon>
              </v-btn>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import { apiClient } from '@/api/client'

  definePage({
    meta: { layout: 'blank' },
  })

  const router = useRouter()
  const authStore = useAuthStore()

  interface Association {
    id: string
    email: string
    edgeId: string
    isPrimary: boolean
    status: 'active' | 'pending'
    user: { id: string; name: string; email: string; avatarUrl?: string } | null
    createdAt: string
  }

  interface KnownEdge {
    edgeId: string
    slideCount: number
    userCount: number
  }

  const associations = ref<Association[]>([])
  const knownEdges = ref<KnownEdge[]>([])
  const loading = ref(true)
  const adding = ref(false)
  const deleting = ref<string | null>(null)

  const newEmail = ref('')
  const newEdgeId = ref('')
  const formMessage = ref('')
  const formMessageType = ref<'success' | 'error' | 'info'>('success')

  async function loadData () {
    loading.value = true
    try {
      const [edgesRes, knownRes] = await Promise.all([
        apiClient.get<{ edges: Association[] }>('/admin/user-edges'),
        apiClient.get<{ edges: KnownEdge[] }>('/admin/edges'),
      ])
      associations.value = edgesRes.edges
      knownEdges.value = knownRes.edges
    } catch (err: any) {
      console.error('Failed to load edges:', err)
    } finally {
      loading.value = false
    }
  }

  async function addAssociation () {
    if (!newEmail.value || !newEdgeId.value) return
    adding.value = true
    formMessage.value = ''
    try {
      const res = await apiClient.post<{ status: string; email: string }>('/admin/user-edges', {
        email: newEmail.value.trim(),
        edgeId: newEdgeId.value.trim(),
        isPrimary: true,
      })
      formMessage.value = res.status === 'active'
        ? `${res.email} vinculado com sucesso!`
        : `Vinculo pendente criado para ${res.email}. Sera ativado no primeiro login.`
      formMessageType.value = 'success'
      newEmail.value = ''
      newEdgeId.value = ''
      await loadData()
    } catch (err: any) {
      formMessage.value = err.message || 'Erro ao vincular'
      formMessageType.value = 'error'
    } finally {
      adding.value = false
    }
  }

  async function removeAssociation (id: string) {
    deleting.value = id
    try {
      await apiClient.delete(`/admin/user-edges/${id}`)
      await loadData()
    } catch (err: any) {
      console.error('Failed to remove:', err)
    } finally {
      deleting.value = null
    }
  }

  function goToDashboard () {
    router.push('/dashboard')
  }

  onMounted(async () => {
    const isValid = await authStore.initFromStorage()
    if (!isValid) {
      router.push('/')
      return
    }
    if (authStore.user?.role !== 'admin') return
    await loadData()
  })
</script>

<style scoped lang="scss">
.dashboard {
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}

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

.dashboard-main {
  max-width: 700px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header {
  display: flex;
  align-items: center;
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

.settings-section {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  padding: 16px;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0 0 12px;
}

.form-row {
  display: flex;
  gap: 12px;
  align-items: center;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.not-admin {
  text-align: center;
  padding: 48px 24px;
  color: rgb(var(--v-theme-on-surface-variant));

  p {
    margin-top: 12px;
    font-size: 0.95rem;
  }
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: rgb(var(--v-theme-on-surface-variant));

  p {
    margin-top: 8px;
    font-size: 0.85rem;
  }
}

.edge-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));

  &:first-of-type {
    border-top: none;
  }
}

.edge-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edge-id {
  font-weight: 600;
  font-size: 0.9rem;
  font-family: monospace;
}

.edge-stats {
  display: flex;
  gap: 6px;
}

.assoc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));

  &:first-of-type {
    border-top: none;
  }
}

.assoc-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.assoc-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.assoc-email {
  font-weight: 500;
  font-size: 0.9rem;
  color: rgb(var(--v-theme-on-surface));
}

.assoc-detail {
  font-size: 0.8rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

.mt-4 {
  margin-top: 16px;
}

.mt-3 {
  margin-top: 12px;
}

@media (max-width: 600px) {
  .dashboard-header {
    padding: 12px 16px;
  }

  .dashboard-main {
    padding: 24px 16px;
  }
}
</style>
