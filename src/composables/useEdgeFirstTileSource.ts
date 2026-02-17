import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Configuration
 */
const ENV_EDGE_AGENT_ID = import.meta.env.VITE_EDGE_AGENT_ID || ''
const EDGE_DIRECT_URL = import.meta.env.VITE_EDGE_DIRECT_URL || ''
const WELL_KNOWN_EDGE_URL = 'https://supernavi-edge.local:3443'
const EDGE_HEALTH_TIMEOUT_MS = Number(import.meta.env.VITE_EDGE_HEALTH_TIMEOUT_MS) || 800
const CLOUD_BASE_URL = import.meta.env.VITE_API_URL || ''

/**
 * Tile source origin
 */
export type TileSourceOrigin = 'direct' | 'tunnel' | 'cloud' | 'unknown'

/**
 * Manifest format from edge/cloud
 */
export interface TileManifest {
  protocol?: string
  tileSize: number
  format: string
  width: number
  height: number
  levelMax?: number
  maxLevel?: number
  tileUrlTemplate?: string
  onDemand?: boolean
  appMag?: number | null
  mpp?: number | null
  originalLevelMax?: number
  maxPreviewLevel?: number
  levelOffset?: number
  storage?: { prefix?: string }
}

/**
 * Get edge agent ID from auth store or env
 */
function getEdgeAgentId (): string {
  try {
    const authStore = useAuthStore()
    return authStore.user?.edgeId || ENV_EDGE_AGENT_ID
  } catch {
    return ENV_EDGE_AGENT_ID
  }
}

/**
 * Session-sticky edge direct URL cache.
 * undefined = not yet checked, null = checked but not found, string = working URL
 */
let _cachedDirectUrl: string | null | undefined = undefined

/**
 * Check health of a URL with fast timeout
 */
async function checkHealth (url: string, timeoutMs: number): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch(`${url}/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (response.ok) {
      const data = await response.json()
      console.log(`[EdgeFirst] Health OK: ${url}`, data)
      return true
    }
    console.log(`[EdgeFirst] Health failed: ${url} → ${response.status}`)
    return false
  } catch (error) {
    const name = (error as Error).name
    if (name === 'AbortError') {
      console.log(`[EdgeFirst] Health timeout: ${url} (${timeoutMs}ms)`)
    } else {
      console.log(`[EdgeFirst] Health error: ${url} → ${(error as Error).message}`)
    }
    return false
  }
}

/**
 * Discover direct edge URL. Tries VITE_EDGE_DIRECT_URL, then well-known.
 * Result is cached for the session (sticky).
 */
async function discoverDirectEdge (): Promise<string | null> {
  if (_cachedDirectUrl !== undefined) {
    return _cachedDirectUrl
  }

  const candidates = [EDGE_DIRECT_URL, WELL_KNOWN_EDGE_URL].filter(Boolean)

  for (const url of candidates) {
    console.log(`[EdgeFirst] Trying direct edge: ${url}`)
    const ok = await checkHealth(url, EDGE_HEALTH_TIMEOUT_MS)
    if (ok) {
      _cachedDirectUrl = url
      console.log(`[EdgeFirst] Direct edge discovered: ${url}`)
      return url
    }
  }

  _cachedDirectUrl = null
  console.log('[EdgeFirst] No direct edge found, will use tunnel/cloud')
  return null
}

/**
 * Invalidate sticky cache (called on repeated tile errors)
 */
function invalidateDirectEdgeCache (): void {
  console.log('[EdgeFirst] Invalidating direct edge cache')
  _cachedDirectUrl = undefined
}

/**
 * Check tunnel health via cloud
 */
async function checkTunnelHealth (agentId: string): Promise<boolean> {
  if (!agentId) return false
  const url = `${CLOUD_BASE_URL}/edge/${agentId}`
  return checkHealth(url, 3000)
}

/**
 * Fetch manifest from a base URL (direct edge or tunnel)
 */
async function fetchManifest (baseUrl: string, slideId: string): Promise<TileManifest> {
  const url = `${baseUrl}/v1/slides/${slideId}/manifest`
  console.log(`[EdgeFirst] Fetching manifest: ${url}`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Manifest failed: ${response.status}`)
  return response.json()
}

/**
 * Fetch cloud preview manifest
 */
async function fetchCloudManifest (slideId: string): Promise<TileManifest> {
  const url = `${CLOUD_BASE_URL}/preview/${slideId}/manifest.json`
  console.log(`[EdgeFirst] Fetching cloud manifest: ${url}`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Cloud manifest failed: ${response.status}`)
  return response.json()
}

/**
 * Create tile source for direct edge or tunnel edge
 */
function createEdgeTileSource (baseUrl: string, slideId: string, manifest: TileManifest): object {
  const maxLevel = manifest.levelMax ?? manifest.maxLevel ?? Math.ceil(Math.log2(Math.max(manifest.width, manifest.height)))
  const format = manifest.format || 'jpg'

  return {
    width: manifest.width,
    height: manifest.height,
    tileSize: manifest.tileSize || 256,
    tileOverlap: 0,
    minLevel: 0,
    maxLevel,
    getTileUrl (level: number, x: number, y: number): string {
      return `${baseUrl}/v1/slides/${slideId}/tiles/${level}/${x}/${y}.${format}`
    },
  }
}

/**
 * Create tile source for cloud preview
 */
function createCloudTileSource (slideId: string, manifest: TileManifest): object {
  const format = manifest.format || 'jpg'
  const absoluteMaxLevel = Math.ceil(Math.log2(Math.max(manifest.width, manifest.height)))
  const rebasedMaxLevel = manifest.maxPreviewLevel ?? manifest.levelMax ?? manifest.maxLevel ?? absoluteMaxLevel
  const levelOffset = absoluteMaxLevel - rebasedMaxLevel

  return {
    width: manifest.width,
    height: manifest.height,
    tileSize: manifest.tileSize || 256,
    tileOverlap: 0,
    minLevel: levelOffset,
    maxLevel: absoluteMaxLevel,
    getTileUrl (level: number, x: number, y: number): string {
      return `${CLOUD_BASE_URL}/preview/${slideId}/tiles/${level}/${x}_${y}.${format}`
    },
  }
}

// --- Singleton state ---
const _isLoading = ref(false)
const _error = ref<Error | null>(null)
const _origin = ref<TileSourceOrigin>('unknown')
const _fallbackReason = ref<string | null>(null)
const _manifest = ref<TileManifest | null>(null)
const _tileSource = ref<object | null>(null)
const _thumbnailUrl = ref<string | null>(null)
const _edgeAvailable = ref(false)
const _currentSlideId = ref<string | null>(null)

export function useEdgeFirstTileSource () {
  const isLoading = _isLoading
  const error = _error
  const origin = _origin
  const fallbackReason = _fallbackReason
  const manifest = _manifest
  const tileSource = _tileSource
  const thumbnailUrl = _thumbnailUrl
  const edgeAvailable = _edgeAvailable
  const currentSlideId = _currentSlideId

  /**
   * Load slide: direct edge → tunnel → cloud preview
   */
  async function load (slideId: string): Promise<void> {
    if (!slideId) {
      error.value = new Error('slideId is required')
      return
    }

    isLoading.value = true
    error.value = null
    origin.value = 'unknown'
    fallbackReason.value = null
    currentSlideId.value = slideId

    try {
      // Step 1: Try direct edge (LAN)
      const directUrl = await discoverDirectEdge()
      if (directUrl) {
        try {
          const edgeManifest = await fetchManifest(directUrl, slideId)
          manifest.value = edgeManifest
          tileSource.value = createEdgeTileSource(directUrl, slideId, edgeManifest)
          thumbnailUrl.value = `${directUrl}/v1/slides/${slideId}/thumb`
          origin.value = 'direct'
          edgeAvailable.value = true
          console.log('[EdgeFirst] Loaded from DIRECT edge (LAN)')
          return
        } catch (err) {
          console.warn('[EdgeFirst] Direct edge manifest failed:', (err as Error).message)
          fallbackReason.value = `Direct edge failed: ${(err as Error).message}`
        }
      }

      // Step 2: Try tunnel via cloud
      const agentId = getEdgeAgentId()
      const tunnelOk = await checkTunnelHealth(agentId)
      edgeAvailable.value = tunnelOk

      if (tunnelOk) {
        try {
          const tunnelBaseUrl = `${CLOUD_BASE_URL}/edge/${agentId}`
          const edgeManifest = await fetchManifest(tunnelBaseUrl, slideId)
          manifest.value = edgeManifest
          tileSource.value = createEdgeTileSource(tunnelBaseUrl, slideId, edgeManifest)
          thumbnailUrl.value = `${tunnelBaseUrl}/v1/slides/${slideId}/thumb`
          origin.value = 'tunnel'
          console.log('[EdgeFirst] Loaded from TUNNEL edge (via cloud)')
          return
        } catch (err) {
          console.warn('[EdgeFirst] Tunnel manifest failed:', (err as Error).message)
          fallbackReason.value = `Tunnel failed: ${(err as Error).message}`
        }
      } else if (!directUrl) {
        fallbackReason.value = 'Edge not available (direct or tunnel)'
      }

      // Step 3: Fall back to cloud preview
      console.log('[EdgeFirst] Falling back to cloud preview...')
      const cloudManifest = await fetchCloudManifest(slideId)
      manifest.value = cloudManifest
      tileSource.value = createCloudTileSource(slideId, cloudManifest)
      thumbnailUrl.value = `${CLOUD_BASE_URL}/preview/${slideId}/thumb.jpg`
      origin.value = 'cloud'

      const maxPreviewLevel = cloudManifest.maxPreviewLevel ?? cloudManifest.levelMax ?? 0
      const originalMaxLevel = cloudManifest.originalLevelMax ?? maxPreviewLevel
      if (originalMaxLevel > maxPreviewLevel) {
        console.warn(`[EdgeFirst] Cloud limited to level ${maxPreviewLevel}, original has ${originalMaxLevel}. Connect Edge for full resolution.`)
      }

      console.log('[EdgeFirst] Loaded from CLOUD preview')
    } catch (error_) {
      console.error('[EdgeFirst] Failed to load slide:', error_)
      error.value = error_ as Error
      origin.value = 'unknown'
      throw error_
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Called on repeated tile errors — invalidates sticky cache
   */
  function onTileError (): void {
    if (origin.value === 'direct') {
      invalidateDirectEdgeCache()
    }
  }

  /**
   * Force reload from a specific source
   */
  async function reloadFromSource (slideId: string, source: 'direct' | 'tunnel' | 'cloud'): Promise<void> {
    if (!slideId) {
      error.value = new Error('slideId is required')
      return
    }

    isLoading.value = true
    error.value = null
    currentSlideId.value = slideId

    try {
      if (source === 'direct') {
        const directUrl = await discoverDirectEdge()
        if (!directUrl) throw new Error('Direct edge not available')
        const edgeManifest = await fetchManifest(directUrl, slideId)
        manifest.value = edgeManifest
        tileSource.value = createEdgeTileSource(directUrl, slideId, edgeManifest)
        thumbnailUrl.value = `${directUrl}/v1/slides/${slideId}/thumb`
        origin.value = 'direct'
        fallbackReason.value = null
      } else if (source === 'tunnel') {
        const agentId = getEdgeAgentId()
        if (!agentId) throw new Error('No edge agent configured')
        const tunnelBaseUrl = `${CLOUD_BASE_URL}/edge/${agentId}`
        const edgeManifest = await fetchManifest(tunnelBaseUrl, slideId)
        manifest.value = edgeManifest
        tileSource.value = createEdgeTileSource(tunnelBaseUrl, slideId, edgeManifest)
        thumbnailUrl.value = `${tunnelBaseUrl}/v1/slides/${slideId}/thumb`
        origin.value = 'tunnel'
        fallbackReason.value = null
      } else {
        const cloudManifest = await fetchCloudManifest(slideId)
        manifest.value = cloudManifest
        tileSource.value = createCloudTileSource(slideId, cloudManifest)
        thumbnailUrl.value = `${CLOUD_BASE_URL}/preview/${slideId}/thumb.jpg`
        origin.value = 'cloud'
        fallbackReason.value = 'Manually selected cloud'
      }
    } catch (error_) {
      error.value = error_ as Error
      throw error_
    } finally {
      isLoading.value = false
    }
  }

  function clear (): void {
    isLoading.value = false
    error.value = null
    origin.value = 'unknown'
    fallbackReason.value = null
    manifest.value = null
    tileSource.value = null
    thumbnailUrl.value = null
    currentSlideId.value = null
  }

  const edgeAgentId = computed(() => getEdgeAgentId())
  const isEdgeConfigured = computed(() => !!getEdgeAgentId())
  const status = computed(() => {
    if (isLoading.value) return 'Carregando...'
    if (error.value) return `Erro: ${error.value.message}`
    if (origin.value === 'direct') return 'Local (Direto)'
    if (origin.value === 'tunnel') return 'Local (Tunnel)'
    if (origin.value === 'cloud') return 'Cloud (Preview)'
    return 'Não carregado'
  })

  return {
    isLoading, error, origin, fallbackReason, manifest, tileSource,
    thumbnailUrl, edgeAvailable, currentSlideId,
    edgeAgentId, isEdgeConfigured, status,
    load, reloadFromSource, onTileError, clear,
  }
}

export default useEdgeFirstTileSource
