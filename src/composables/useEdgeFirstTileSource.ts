import { computed, ref } from 'vue'

/**
 * Configuration
 */
const CLOUD_BASE_URL = import.meta.env.VITE_API_URL || ''

/**
 * Tile source origin
 */
export type TileSourceOrigin = 'direct' | 'tunnel' | 'cloud' | 'unknown'

/**
 * Manifest format
 */
export interface TileManifest {
  tileSize: number
  format: string
  width: number
  height: number
  levelMax?: number
  maxLevel?: number
}

// --- Singleton state ---
const _isLoading = ref(false)
const _error = ref<Error | null>(null)
const _origin = ref<TileSourceOrigin>('unknown')
const _fallbackReason = ref<string | null>(null)
const _manifest = ref<TileManifest | null>(null)
const _tileSource = ref<object | null>(null)
const _thumbnailUrl = ref<string | null>(null)
const _currentSlideId = ref<string | null>(null)

export function useEdgeFirstTileSource () {
  const isLoading = _isLoading
  const error = _error
  const origin = _origin
  const fallbackReason = _fallbackReason
  const manifest = _manifest
  const tileSource = _tileSource
  const thumbnailUrl = _thumbnailUrl
  const currentSlideId = _currentSlideId

  /**
   * Load slide tiles from cloud via DZI XML + signed URL redirects
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
      // Fetch DZI XML from cloud
      const dziResponse = await fetch(`${CLOUD_BASE_URL}/api/v1/slides/${slideId}/dzi.xml`)
      if (!dziResponse.ok) {
        throw new Error(`DZI not available (${dziResponse.status})`)
      }

      const dziXml = await dziResponse.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(dziXml, 'application/xml')
      const image = doc.querySelector('Image')
      const size = doc.querySelector('Size')

      const tileSize = parseInt(image?.getAttribute('TileSize') || '256')
      const format = image?.getAttribute('Format') || 'jpg'
      const width = parseInt(size?.getAttribute('Width') || '0')
      const height = parseInt(size?.getAttribute('Height') || '0')
      const maxLevel = Math.ceil(Math.log2(Math.max(width, height)))

      manifest.value = { width, height, tileSize, format, levelMax: maxLevel }

      tileSource.value = {
        width,
        height,
        tileSize,
        tileOverlap: 0,
        minLevel: 0,
        maxLevel,
        getTileUrl (level: number, x: number, y: number): string {
          return `${CLOUD_BASE_URL}/api/v1/tiles/${slideId}/${level}/${x}_${y}.${format}`
        },
      }

      thumbnailUrl.value = `${CLOUD_BASE_URL}/api/v1/slides/${slideId}/thumb`
      origin.value = 'cloud'

      console.log(`[TileSource] Loaded from cloud: ${width}x${height}, ${maxLevel} levels`)
    } catch (error_) {
      console.error('[TileSource] Failed to load slide:', error_)
      error.value = error_ as Error
      origin.value = 'unknown'
      throw error_
    } finally {
      isLoading.value = false
    }
  }

  function onTileError (): void {
    // No-op in cloud-only mode
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

  const edgeAvailable = computed(() => false)
  const edgeAgentId = computed(() => '')
  const isEdgeConfigured = computed(() => false)
  const status = computed(() => {
    if (isLoading.value) return 'Carregando...'
    if (error.value) return `Erro: ${error.value.message}`
    if (origin.value === 'cloud') return 'Cloud'
    return 'Não carregado'
  })

  return {
    isLoading, error, origin, fallbackReason, manifest, tileSource,
    thumbnailUrl, edgeAvailable, currentSlideId,
    edgeAgentId, isEdgeConfigured, status,
    load, onTileError, clear,
  }
}

export default useEdgeFirstTileSource
