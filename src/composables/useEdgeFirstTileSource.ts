import { computed, ref, type Ref } from 'vue'

/**
 * Edge agent configuration from environment
 */
const EDGE_AGENT_ID = import.meta.env.VITE_EDGE_AGENT_ID || ''
const EDGE_HEALTH_TIMEOUT_MS = Number(import.meta.env.VITE_EDGE_HEALTH_TIMEOUT_MS) || 500

/**
 * Tile source origin (where tiles are being loaded from)
 */
export type TileSourceOrigin = 'local' | 'cloud' | 'unknown'

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
}

/**
 * Edge-first tile source state
 */
export interface EdgeFirstTileSourceState {
  isLoading: boolean
  error: Error | null
  origin: TileSourceOrigin
  fallbackReason: string | null
  manifest: TileManifest | null
  tileSource: object | null
  thumbnailUrl: string | null
  edgeAgentId: string
  edgeAvailable: boolean
}

/**
 * Check if the edge agent is available via the cloud tunnel
 */
async function checkEdgeHealth (agentId: string, timeoutMs: number): Promise<boolean> {
  if (!agentId) {
    console.log('[EdgeFirst] No agentId configured, skipping edge check')
    return false
  }

  const healthUrl = `/edge/${agentId}/v1/health`
  console.log(`[EdgeFirst] Checking edge health: ${healthUrl}`)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      console.log('[EdgeFirst] Edge agent is available:', data)
      return true
    }

    console.log(`[EdgeFirst] Edge health check failed: ${response.status}`)
    return false
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log(`[EdgeFirst] Edge health check timed out (${timeoutMs}ms)`)
    } else {
      console.log('[EdgeFirst] Edge health check error:', (error as Error).message)
    }
    return false
  }
}

/**
 * Fetch manifest from local edge
 */
async function fetchLocalManifest (agentId: string, slideId: string): Promise<TileManifest> {
  const url = `/edge/${agentId}/v1/slides/${slideId}/manifest`
  console.log(`[EdgeFirst] Fetching local manifest: ${url}`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch local manifest: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch manifest from cloud preview
 */
async function fetchCloudManifest (slideId: string): Promise<TileManifest> {
  const url = `/preview/${slideId}/manifest.json`
  console.log(`[EdgeFirst] Fetching cloud manifest: ${url}`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch cloud manifest: ${response.status}`)
  }

  return response.json()
}

/**
 * Create OpenSeadragon tile source for local edge
 */
function createLocalTileSource (agentId: string, slideId: string, manifest: TileManifest): object {
  const maxLevel = manifest.levelMax ?? manifest.maxLevel ?? Math.ceil(Math.log2(Math.max(manifest.width, manifest.height)))
  const format = manifest.format || 'jpg'

  return {
    width: manifest.width,
    height: manifest.height,
    tileSize: manifest.tileSize || 256,
    tileOverlap: 0,
    minLevel: 0,
    maxLevel,
    // Custom tile URL function for local edge
    getTileUrl (level: number, x: number, y: number): string {
      return `/edge/${agentId}/v1/slides/${slideId}/tiles/${level}/${x}/${y}.${format}`
    },
  }
}

/**
 * Create OpenSeadragon tile source for cloud preview
 */
function createCloudTileSource (slideId: string, manifest: TileManifest): object {
  const maxLevel = manifest.levelMax ?? manifest.maxLevel ?? Math.ceil(Math.log2(Math.max(manifest.width, manifest.height)))
  const format = manifest.format || 'jpg'

  return {
    width: manifest.width,
    height: manifest.height,
    tileSize: manifest.tileSize || 256,
    tileOverlap: 0,
    minLevel: 0,
    maxLevel,
    // Custom tile URL function for cloud preview
    getTileUrl (level: number, x: number, y: number): string {
      return `/preview/${slideId}/tiles/${level}/${x}_${y}.${format}`
    },
  }
}

/**
 * Composable for edge-first tile loading
 *
 * Automatically detects if the local edge agent is available via the cloud tunnel
 * and loads tiles from the edge when possible, falling back to cloud preview otherwise.
 *
 * All requests go through app.supernavi.app - no direct access to localhost or S3.
 *
 * Usage:
 * ```ts
 * const { load, tileSource, thumbnailUrl, origin, edgeAvailable } = useEdgeFirstTileSource()
 *
 * // Load a slide
 * await load('slide-123')
 *
 * // Check which source is being used
 * console.log(origin.value) // 'local' or 'cloud'
 *
 * // Use with OpenSeadragon
 * viewer.open(tileSource.value)
 * ```
 */
export function useEdgeFirstTileSource () {
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const origin = ref<TileSourceOrigin>('unknown')
  const fallbackReason = ref<string | null>(null)
  const manifest = ref<TileManifest | null>(null)
  const tileSource = ref<object | null>(null)
  const thumbnailUrl = ref<string | null>(null)
  const edgeAvailable = ref(false)
  const currentSlideId = ref<string | null>(null)

  /**
   * Load a slide with edge-first strategy
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
      // Step 1: Check if edge agent is available
      const edgeOk = await checkEdgeHealth(EDGE_AGENT_ID, EDGE_HEALTH_TIMEOUT_MS)
      edgeAvailable.value = edgeOk

      if (edgeOk) {
        // Step 2a: Try to load from local edge
        try {
          const localManifest = await fetchLocalManifest(EDGE_AGENT_ID, slideId)
          manifest.value = localManifest

          tileSource.value = createLocalTileSource(EDGE_AGENT_ID, slideId, localManifest)
          thumbnailUrl.value = `/edge/${EDGE_AGENT_ID}/v1/slides/${slideId}/thumb`
          origin.value = 'local'

          console.log('[EdgeFirst] Loaded from LOCAL edge')
          return
        } catch (localError) {
          console.warn('[EdgeFirst] Failed to load from local edge:', (localError as Error).message)
          fallbackReason.value = `Local load failed: ${(localError as Error).message}`
          // Fall through to cloud
        }
      } else {
        fallbackReason.value = 'Edge agent not available'
      }

      // Step 2b: Fall back to cloud preview
      console.log('[EdgeFirst] Falling back to cloud preview...')

      const cloudManifest = await fetchCloudManifest(slideId)
      manifest.value = cloudManifest

      tileSource.value = createCloudTileSource(slideId, cloudManifest)
      thumbnailUrl.value = `/preview/${slideId}/thumb.jpg`
      origin.value = 'cloud'

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
   * Force reload from a specific source
   */
  async function reloadFromSource (slideId: string, source: 'local' | 'cloud'): Promise<void> {
    if (!slideId) {
      error.value = new Error('slideId is required')
      return
    }

    isLoading.value = true
    error.value = null
    currentSlideId.value = slideId

    try {
      if (source === 'local') {
        if (!EDGE_AGENT_ID) {
          throw new Error('No edge agent configured')
        }

        const localManifest = await fetchLocalManifest(EDGE_AGENT_ID, slideId)
        manifest.value = localManifest

        tileSource.value = createLocalTileSource(EDGE_AGENT_ID, slideId, localManifest)
        thumbnailUrl.value = `/edge/${EDGE_AGENT_ID}/v1/slides/${slideId}/thumb`
        origin.value = 'local'
        fallbackReason.value = null
      } else {
        const cloudManifest = await fetchCloudManifest(slideId)
        manifest.value = cloudManifest

        tileSource.value = createCloudTileSource(slideId, cloudManifest)
        thumbnailUrl.value = `/preview/${slideId}/thumb.jpg`
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

  /**
   * Clear current state
   */
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

  /**
   * Get the configured edge agent ID
   */
  const edgeAgentId = computed(() => EDGE_AGENT_ID)

  /**
   * Check if edge is configured
   */
  const isEdgeConfigured = computed(() => !!EDGE_AGENT_ID)

  /**
   * Get a human-readable status
   */
  const status = computed(() => {
    if (isLoading.value) {
      return 'Carregando...'
    }
    if (error.value) {
      return `Erro: ${error.value.message}`
    }
    if (origin.value === 'local') {
      return 'Local (Edge)'
    }
    if (origin.value === 'cloud') {
      return 'Cloud (Preview)'
    }
    return 'Não carregado'
  })

  return {
    // State
    isLoading,
    error,
    origin,
    fallbackReason,
    manifest,
    tileSource,
    thumbnailUrl,
    edgeAvailable,
    currentSlideId,

    // Computed
    edgeAgentId,
    isEdgeConfigured,
    status,

    // Methods
    load,
    reloadFromSource,
    clear,
  }
}

export default useEdgeFirstTileSource
