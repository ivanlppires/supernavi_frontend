import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Edge agent configuration from environment (fallback for dev)
 */
const API_URL = import.meta.env.VITE_API_URL || ''
const ENV_EDGE_AGENT_ID = import.meta.env.VITE_EDGE_AGENT_ID || ''
const EDGE_HEALTH_TIMEOUT_MS = Number(import.meta.env.VITE_EDGE_HEALTH_TIMEOUT_MS) || 2000
const EDGE_STATUS_POLL_INTERVAL_MS = 30_000 // Poll every 30 seconds

/**
 * Edge status info from cloud
 */
export interface EdgeStatusInfo {
  agentId: string
  connected: boolean
  connectedAt?: string
  lastActivity?: string
}

/**
 * Global edge connection status
 */
const isChecking = ref(false)
const lastCheck = ref<Date | null>(null)
const edgeConnected = ref(false)
const edgeAgentInfo = ref<EdgeStatusInfo | null>(null)
const error = ref<string | null>(null)

// Dynamic edge agent ID: prefers user profile, falls back to env var
const resolvedEdgeAgentId = ref(ENV_EDGE_AGENT_ID)

let pollInterval: ReturnType<typeof setInterval> | null = null
let isInitialized = false

/**
 * Check edge status via cloud API
 */
async function checkEdgeStatus (): Promise<void> {
  if (isChecking.value) {
    return
  }

  isChecking.value = true
  error.value = null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), EDGE_HEALTH_TIMEOUT_MS)

    // Check cloud's edge status endpoint
    const statusUrl = `${API_URL}/edge/status`
    const response = await fetch(statusUrl, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()

      // Response format: { connectedAgents: number, agents: [...] }
      const agents = data.agents || []
      const targetId = resolvedEdgeAgentId.value

      // Check if our target agent is connected
      if (targetId && agents.length > 0) {
        const agent = agents.find(
          (a: EdgeStatusInfo) => a.agentId === targetId,
        )

        if (agent) {
          edgeConnected.value = true
          edgeAgentInfo.value = {
            agentId: agent.agentId,
            connected: true,
            connectedAt: agent.connectedAt,
            lastActivity: agent.lastSeen,
          }
        } else {
          edgeConnected.value = false
          edgeAgentInfo.value = null
        }
      } else if (agents.length > 0) {
        // No specific agent configured, auto-discover first connected
        const agent = agents[0]
        edgeConnected.value = true
        edgeAgentInfo.value = {
          agentId: agent.agentId,
          connected: true,
          connectedAt: agent.connectedAt,
          lastActivity: agent.lastSeen,
        }
      } else {
        edgeConnected.value = false
        edgeAgentInfo.value = null
      }
    } else {
      edgeConnected.value = false
      edgeAgentInfo.value = null
      error.value = `Status check failed: ${response.status}`
    }
  } catch (error_) {
    edgeConnected.value = false
    edgeAgentInfo.value = null

    error.value = (error_ as Error).name === 'AbortError' ? 'Status check timed out' : (error_ as Error).message
  } finally {
    isChecking.value = false
    lastCheck.value = new Date()
  }
}

/**
 * Start polling for edge status
 */
function startPolling (): void {
  if (pollInterval) {
    return
  }

  // Initial check
  checkEdgeStatus()

  // Set up polling
  pollInterval = setInterval(checkEdgeStatus, EDGE_STATUS_POLL_INTERVAL_MS)
}

/**
 * Stop polling
 */
function stopPolling (): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

/**
 * Composable for global edge connection status
 *
 * Shows whether a local edge agent is connected to the cloud via tunnel.
 * The edge agent ID is auto-detected from the user's profile (derived from
 * their slides), with fallback to VITE_EDGE_AGENT_ID env var and auto-discovery.
 *
 * Usage:
 * ```ts
 * const { edgeConnected, agentId, status, refresh } = useEdgeStatus()
 * ```
 */
export function useEdgeStatus () {
  // Initialize polling on first use
  onMounted(() => {
    const authStore = useAuthStore()
    if (authStore.user?.edgeId) {
      resolvedEdgeAgentId.value = authStore.user.edgeId
    }

    // Watch for auth store changes (e.g. after login or profile refresh)
    watch(() => authStore.userEdgeId, (newEdgeId) => {
      const prev = resolvedEdgeAgentId.value
      resolvedEdgeAgentId.value = newEdgeId || ENV_EDGE_AGENT_ID
      if (resolvedEdgeAgentId.value !== prev) {
        checkEdgeStatus()
      }
    })

    if (!isInitialized) {
      isInitialized = true
      startPolling()
    }
  })

  // Computed properties
  const agentId = computed(() => edgeAgentInfo.value?.agentId || resolvedEdgeAgentId.value || null)

  const isConfigured = computed(() => !!resolvedEdgeAgentId.value)

  const status = computed(() => {
    if (isChecking.value) {
      return 'checking'
    }
    if (edgeConnected.value) {
      return 'connected'
    }
    if (error.value) {
      return 'error'
    }
    return 'disconnected'
  })

  const statusText = computed(() => {
    if (isChecking.value) {
      return 'Verificando...'
    }
    if (edgeConnected.value) {
      const id = edgeAgentInfo.value?.agentId || resolvedEdgeAgentId.value
      return `Agente Local (${id})`
    }
    return 'Cloud (sem agente local)'
  })

  const statusColor = computed(() => {
    if (isChecking.value) {
      return 'warning'
    }
    if (edgeConnected.value) {
      return 'success'
    }
    return 'default'
  })

  const statusIcon = computed(() => {
    if (isChecking.value) {
      return 'mdi-cloud-sync'
    }
    if (edgeConnected.value) {
      return 'mdi-lan-connect'
    }
    return 'mdi-cloud-outline'
  })

  /**
   * Force a status refresh
   */
  function refresh (): Promise<void> {
    return checkEdgeStatus()
  }

  return {
    // State
    isChecking,
    lastCheck,
    edgeConnected,
    edgeAgentInfo,
    error,

    // Computed
    agentId,
    isConfigured,
    status,
    statusText,
    statusColor,
    statusIcon,

    // Methods
    refresh,
    startPolling,
    stopPolling,
  }
}

export default useEdgeStatus
