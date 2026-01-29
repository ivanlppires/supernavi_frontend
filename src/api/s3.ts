import { apiClient } from './client'

// Types
interface SignedUrlResponse {
  url: string
  expiresIn: number
}

interface BatchSignedUrlResponse {
  urls: Record<string, string>
  expiresIn: number
}

interface S3HealthResponse {
  status: 'ok' | 'error' | 'not_configured'
  bucket?: string
  region?: string
  endpoint?: string
  error?: string
  cache?: {
    size: number
    maxSize: number
  }
}

// Local cache for signed URLs
interface CachedUrl {
  url: string
  expiresAt: number
}

const urlCache = new Map<string, CachedUrl>()
const CACHE_BUFFER_MS = 10_000 // URL must be valid for at least 10s
const MAX_CACHE_SIZE = 5000

/**
 * Clean expired entries from cache
 */
function cleanCache (): void {
  const now = Date.now()
  for (const [key, entry] of urlCache) {
    if (entry.expiresAt <= now) {
      urlCache.delete(key)
    }
  }

  // If still over limit, remove oldest entries
  if (urlCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(urlCache.entries())
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt)
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE)
    for (const [key] of toRemove) {
      urlCache.delete(key)
    }
  }
}

/**
 * Get signed URL from cache or fetch from API
 */
export async function getSignedUrl (key: string, expires = 60): Promise<string> {
  const now = Date.now()

  // Check cache first
  const cached = urlCache.get(key)
  if (cached && cached.expiresAt > now + CACHE_BUFFER_MS) {
    return cached.url
  }

  // Fetch from API
  const response = await apiClient.get<SignedUrlResponse>('/s3/sign-get', { key, expires })

  // Cache the result
  urlCache.set(key, {
    url: response.url,
    expiresAt: now + response.expiresIn * 1000,
  })

  // Clean cache periodically
  if (urlCache.size > MAX_CACHE_SIZE * 0.9) {
    cleanCache()
  }

  return response.url
}

/**
 * Get multiple signed URLs in a single request (batch)
 */
export async function getSignedUrlBatch (keys: string[], expires = 60): Promise<Record<string, string>> {
  const now = Date.now()
  const result: Record<string, string> = {}
  const keysToFetch: string[] = []

  // Check cache first for each key
  for (const key of keys) {
    const cached = urlCache.get(key)
    if (cached && cached.expiresAt > now + CACHE_BUFFER_MS) {
      result[key] = cached.url
    } else {
      keysToFetch.push(key)
    }
  }

  // Fetch remaining keys from API
  if (keysToFetch.length > 0) {
    const response = await apiClient.post<BatchSignedUrlResponse>('/s3/sign-batch', {
      keys: keysToFetch,
      expires,
    })

    // Cache and add to result
    for (const [key, url] of Object.entries(response.urls)) {
      urlCache.set(key, {
        url,
        expiresAt: now + response.expiresIn * 1000,
      })
      result[key] = url
    }
  }

  return result
}

/**
 * Get signed URL for upload
 */
export async function getSignedUploadUrl (
  key: string,
  contentType: string,
  expires = 60,
): Promise<string> {
  const response = await apiClient.post<SignedUrlResponse>('/s3/sign-put', {
    key,
    contentType,
    expires,
  })
  return response.url
}

/**
 * Upload a file directly to the local edge agent
 * This bypasses S3 and sends the file directly to the edge inbox
 */
export async function uploadFileToEdge (
  file: File,
  edgeUrl: string,
  onProgress?: (progress: UploadProgress) => void,
  controller?: UploadController,
): Promise<void> {
  const uploadUrl = `${edgeUrl}/v1/slides/upload`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const startTime = Date.now()
    let lastLoaded = 0
    let lastTime = startTime

    // Expose abort function via controller
    if (controller) {
      controller.abort = () => {
        xhr.abort()
        reject(new Error('Upload cancelled'))
      }
    }

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && onProgress) {
        const now = Date.now()
        const elapsed = now - startTime
        const timeDelta = now - lastTime
        const loadedDelta = e.loaded - lastLoaded

        const instantSpeed = timeDelta > 0 ? (loadedDelta / timeDelta) * 1000 : 0
        const averageSpeed = elapsed > 0 ? (e.loaded / elapsed) * 1000 : 0
        const speed = averageSpeed * 0.7 + instantSpeed * 0.3
        const remaining = speed > 0 ? ((e.total - e.loaded) / speed) * 1000 : 0

        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
          speed,
          elapsed,
          remaining,
        })

        lastLoaded = e.loaded
        lastTime = now
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'))
    })

    xhr.open('POST', uploadUrl)
    xhr.setRequestHeader('X-Filename', file.name)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.send(file)
  })
}

/**
 * Get MIME type for a file, with fallback for unknown extensions
 */
function getContentType (file: File): string {
  // If browser knows the type, use it
  if (file.type) {
    return file.type
  }

  // Fallback based on extension for common slide formats
  const ext = file.name.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    svs: 'image/x-svs',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    ndpi: 'image/x-ndpi',
    vms: 'image/x-vms',
    vmu: 'image/x-vmu',
    scn: 'image/x-scn',
    mrxs: 'image/x-mrxs',
    bif: 'image/x-bif',
    svslide: 'image/x-svslide',
  }

  return mimeTypes[ext || ''] || 'application/octet-stream'
}

/**
 * Upload progress details for UI feedback
 */
export interface UploadProgress {
  loaded: number // Bytes uploaded
  total: number // Total file size in bytes
  percent: number // 0-100
  speed: number // Bytes per second
  elapsed: number // Milliseconds since start
  remaining: number // Estimated milliseconds remaining
}

/**
 * Upload controller for cancellation
 */
export interface UploadController {
  abort: () => void
}

/**
 * Upload a file directly to S3 using a presigned URL
 * Returns a controller object that can be used to abort the upload
 */
export async function uploadFileToS3 (
  file: File,
  key: string,
  onProgress?: (progress: UploadProgress) => void,
  controller?: UploadController,
): Promise<void> {
  // Calculate expiry based on file size (larger files need more time)
  // ~10MB/min on average connection, with minimum 5 minutes, max 1 hour
  const estimatedMinutes = Math.ceil(file.size / (10 * 1024 * 1024))
  const expirySeconds = Math.min(3600, Math.max(300, estimatedMinutes * 60))

  // Get content type with fallback for unknown extensions
  const contentType = getContentType(file)

  // Get presigned upload URL
  const uploadUrl = await getSignedUploadUrl(key, contentType, expirySeconds)

  // Upload using XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const startTime = Date.now()
    let lastLoaded = 0
    let lastTime = startTime

    // Expose abort function via controller
    if (controller) {
      controller.abort = () => {
        xhr.abort()
        reject(new Error('Upload cancelled'))
      }
    }

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && onProgress) {
        const now = Date.now()
        const elapsed = now - startTime
        const timeDelta = now - lastTime
        const loadedDelta = e.loaded - lastLoaded

        // Calculate speed (bytes per second) using moving average
        const instantSpeed = timeDelta > 0 ? (loadedDelta / timeDelta) * 1000 : 0
        const averageSpeed = elapsed > 0 ? (e.loaded / elapsed) * 1000 : 0
        // Blend instant and average for smoother display
        const speed = averageSpeed * 0.7 + instantSpeed * 0.3

        // Estimate remaining time
        const remaining = speed > 0 ? ((e.total - e.loaded) / speed) * 1000 : 0

        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
          speed,
          elapsed,
          remaining,
        })

        lastLoaded = e.loaded
        lastTime = now
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'))
    })

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.send(file)
  })
}

/**
 * Check S3 health
 */
export async function checkS3Health (): Promise<S3HealthResponse> {
  return apiClient.getPublic<S3HealthResponse>('/s3/health')
}

/**
 * Clear local URL cache
 */
export function clearUrlCache (): void {
  urlCache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats (): { size: number, maxSize: number } {
  return {
    size: urlCache.size,
    maxSize: MAX_CACHE_SIZE,
  }
}

// ============================================
// OpenSeadragon Integration (Legacy - Deprecated)
// ============================================
// NOTE: Tile loading now uses backend proxy via /api/slides/:id/tiles/:level/:filename
// The functions below are kept for backwards compatibility but are no longer used.

/**
 * @deprecated Use the proxy endpoint instead: /api/slides/:id/dzi
 * Fetch DZI metadata for a slide through signed URL
 */
export async function fetchDziMetadata (slideId: string): Promise<{
  width: number
  height: number
  tileSize: number
  overlap: number
  format: string
}> {
  // Use proxy endpoint instead of direct S3 access
  const response = await fetch(`/api/slides/${slideId}/dzi`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch DZI metadata: ${response.status}`)
  }

  const xmlText = await response.text()

  // Parse XML
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
