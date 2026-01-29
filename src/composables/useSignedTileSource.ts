import { computed, ref } from 'vue'

// Must match api/client.ts configuration
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://api.supernavi.app') + '/api'
const TOKEN_KEY = 'supernavi_token'

export interface DziMetadata {
  width: number
  height: number
  tileSize: number
  overlap: number
  format: string
}

export interface SignedTileSourceOptions {
  slideId: string
}

/**
 * Composable for loading WSI slides with deterministic URLs through backend proxy.
 *
 * This approach uses synchronous URLs that the backend validates and proxies to S3.
 * OpenSeadragon receives direct URLs that redirect to signed S3 URLs server-side.
 *
 * URL format:
 * - DZI: /api/slides/{slideId}/dzi
 * - Tiles: /api/slides/{slideId}/tiles/{level}/{x}_{y}.{format}
 */
export function useSignedTileSource () {
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const metadata = ref<DziMetadata | null>(null)
  const tileSource = ref<object | null>(null)
  const currentSlideId = ref<string | null>(null)

  /**
   * Parse DZI XML metadata
   */
  function parseDziXml (xmlText: string): DziMetadata {
    const formatMatch = xmlText.match(/Format="(\w+)"/)
    const overlapMatch = xmlText.match(/Overlap="(\d+)"/)
    const tileSizeMatch = xmlText.match(/TileSize="(\d+)"/)
    const heightMatch = xmlText.match(/Height="(\d+)"/)
    const widthMatch = xmlText.match(/Width="(\d+)"/)

    return {
      format: formatMatch?.[1] || 'jpg',
      overlap: Number.parseInt(overlapMatch?.[1] || '1'),
      tileSize: Number.parseInt(tileSizeMatch?.[1] || '256'),
      height: Number.parseInt(heightMatch?.[1] || '0'),
      width: Number.parseInt(widthMatch?.[1] || '0'),
    }
  }

  /**
   * Load a slide and create the tile source with deterministic URLs
   */
  async function load (options: SignedTileSourceOptions): Promise<void> {
    const { slideId } = options

    isLoading.value = true
    error.value = null
    currentSlideId.value = slideId

    try {
      // Fetch DZI metadata through the proxy endpoint
      const authToken = localStorage.getItem(TOKEN_KEY)
      console.log(`[TileSource] Loading DZI metadata for slide: ${slideId}`)
      console.log(`[TileSource] Auth token present: ${!!authToken}`)

      if (!authToken) {
        console.warn('[TileSource] No auth token found - request may fail with 401')
      }

      const dziResponse = await fetch(`${API_BASE_URL}/slides/${slideId}/dzi`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (!dziResponse.ok) {
        throw new Error(`Failed to fetch DZI metadata: ${dziResponse.status}`)
      }

      const dziXml = await dziResponse.text()
      const meta = parseDziXml(dziXml)
      metadata.value = meta

      const maxLevel = Math.ceil(Math.log2(Math.max(meta.width, meta.height)))
      console.log(`[TileSource] Slide: ${meta.width}x${meta.height}, maxLevel: ${maxLevel}`)

      // Create tile source with synchronous, deterministic URLs
      // OpenSeadragon will call getTileUrl() synchronously for each tile
      const source = {
        width: meta.width,
        height: meta.height,
        tileSize: meta.tileSize,
        tileOverlap: meta.overlap,
        minLevel: 0,
        maxLevel,

        // Synchronous URL generation - returns deterministic backend URL
        getTileUrl (level: number, x: number, y: number): string {
          // URL format: {API_BASE_URL}/slides/{slideId}/tiles/{level}/{x}_{y}.{format}
          // The backend will redirect to a signed S3 URL
          return `${API_BASE_URL}/slides/${slideId}/tiles/${level}/${x}_${y}.${meta.format}`
        },

        // Custom AJAX settings to include auth header
        ajaxHeaders: {
          Authorization: `Bearer ${authToken}`,
        },
      }

      tileSource.value = source
      console.log('[TileSource] Tile source created with deterministic URLs')
    } catch (error_) {
      console.error('[TileSource] Failed to load slide:', error_)
      error.value = error_ as Error
      throw error_
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear cache (no longer needed with proxy approach, kept for API compatibility)
   */
  function clearCache (): void {
    // No-op - the backend handles caching
    metadata.value = null
    tileSource.value = null
    currentSlideId.value = null
  }

  /**
   * Get cache statistics (no longer needed with proxy approach)
   */
  const cacheStats = computed(() => ({
    size: 0,
  }))

  return {
    // State
    isLoading,
    error,
    metadata,
    tileSource,
    currentSlideId,
    cacheStats,

    // Methods
    load,
    clearCache,
  }
}
