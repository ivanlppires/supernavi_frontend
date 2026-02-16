<template>
  <div class="viewer-page">
    <!-- Empty State - When no slide is available -->
    <Transition name="fade">
      <div v-if="showEmptyState" class="empty-state">
        <div class="empty-state-content">
          <!-- No slide state -->
          <template v-if="!currentSlide">
            <div class="empty-state-icon">
              <v-icon color="primary" opacity="0.6" size="80">mdi-microscope</v-icon>
            </div>
            <h2 class="empty-state-title">Nenhuma lâmina disponível</h2>
            <p class="empty-state-description">
              Este caso ainda não possui lâminas digitalizadas.
              <br>
              Faça upload de um arquivo SVS no painel do caso.
            </p>
          </template>

          <!-- Processing state - with detailed progress -->
          <template v-else-if="isSlideProcessing">
            <div class="processing-container">
              <!-- Animated icon based on stage -->
              <div class="processing-icon-wrapper">
                <div class="processing-icon-bg" />
                <v-icon
                  class="processing-icon"
                  :class="{ 'icon-pulse': processingProgress === 0 }"
                  color="primary"
                  size="64"
                >
                  {{ processingStageIcon }}
                </v-icon>
              </div>

              <!-- Stage indicator -->
              <div class="processing-stages">
                <div
                  v-for="(stage, idx) in processingStages"
                  :key="idx"
                  class="stage-item"
                  :class="{
                    'stage-active': idx === currentStageIndex,
                    'stage-complete': idx < currentStageIndex,
                    'stage-pending': idx > currentStageIndex
                  }"
                >
                  <div class="stage-dot">
                    <v-icon v-if="idx < currentStageIndex" color="white" size="12">mdi-check</v-icon>
                    <span v-else>{{ idx + 1 }}</span>
                  </div>
                  <span class="stage-label">{{ stage.label }}</span>
                </div>
              </div>

              <!-- Main progress -->
              <div class="processing-main">
                <h2 class="processing-title">{{ processingStageTitle }}</h2>
                <p class="processing-subtitle">{{ processingStageSubtitle }}</p>
              </div>

              <!-- Progress bar with percentage -->
              <div class="processing-progress-container">
                <div class="progress-header">
                  <span class="progress-label">Progresso geral</span>
                  <span class="progress-percent">{{ processingProgress }}%</span>
                </div>
                <v-progress-linear
                  bg-color="rgba(var(--v-theme-primary), 0.1)"
                  color="primary"
                  height="8"
                  :indeterminate="processingProgress === 0"
                  :model-value="processingProgress > 0 ? processingProgress : undefined"
                  rounded
                />
                <div class="progress-footer">
                  <span v-if="estimatedTimeRemaining" class="time-estimate">
                    <v-icon class="mr-1" size="14">mdi-clock-outline</v-icon>
                    {{ estimatedTimeRemaining }}
                  </span>
                  <span v-else class="time-estimate">
                    <v-icon class="mr-1" size="14">mdi-clock-outline</v-icon>
                    Calculando tempo...
                  </span>
                </div>
              </div>

              <!-- File info -->
              <div v-if="currentSlide" class="file-info">
                <v-icon class="mr-1" opacity="0.5" size="16">mdi-file-document</v-icon>
                <span>{{ currentSlide.name }}</span>
                <span v-if="currentSlide.fileSize" class="file-size">
                  ({{ formatFileSize(Number(currentSlide.fileSize)) }})
                </span>
              </div>

              <!-- Helpful tip -->
              <div class="processing-tip">
                <v-icon class="mr-2" color="primary" size="16">mdi-lightbulb-outline</v-icon>
                <span>Você pode voltar ao dashboard e acompanhar o progresso lá. Enviaremos uma notificação quando estiver pronto.</span>
              </div>

              <!-- Back to dashboard button -->
              <v-btn
                class="mt-4"
                color="primary"
                prepend-icon="mdi-arrow-left"
                variant="tonal"
                @click="goToDashboard"
              >
                Voltar ao Dashboard
              </v-btn>
            </div>
          </template>

          <!-- Failed state -->
          <template v-else-if="currentSlide?.processingStatus === 'failed'">
            <div class="empty-state-icon">
              <v-icon color="error" opacity="0.6" size="80">mdi-alert-circle</v-icon>
            </div>
            <h2 class="empty-state-title text-error">Falha no Processamento</h2>
            <p class="empty-state-description">
              Ocorreu um erro ao processar esta lâmina.
              <br>
              <span class="text-error">{{ currentSlide?.processingError || 'Erro desconhecido' }}</span>
            </p>
            <v-btn
              class="mt-4"
              color="primary"
              prepend-icon="mdi-arrow-left"
              variant="tonal"
              @click="goToDashboard"
            >
              Voltar ao Dashboard
            </v-btn>
          </template>

        </div>

        <!-- Background pattern (only for non-processing states) -->
        <div v-if="!isSlideProcessing" class="empty-state-background">
          <div class="grid-pattern" />
        </div>
      </div>
    </Transition>

    <!-- Loading Skeleton - Covers from mount until DziViewer opens -->
    <Transition name="skeleton-fade">
      <div v-if="showSkeleton" class="viewer-skeleton">
        <div class="skeleton-slide-area">
          <div class="skeleton-shimmer" />
        </div>
        <div class="skeleton-caption">
          <div class="skeleton-spinner" />
          <span>Preparando visualização...</span>
        </div>
      </div>
    </Transition>

    <!-- DZI Viewer - Only render when we have a tile source -->
    <DziViewer
      v-if="tileSource"
      ref="dziViewerRef"
      :blend-time="0.3"
      :drawing-mode="drawingMode"
      :max-wait-time="5000"
      :measurements="viewerMeasurements"
      :min-tiles-to-load="6"
      :rois="viewerROIs"
      :selected-r-o-i-id="viewerControls.state.value.selectedROIId"
      :thumbnail-url="currentThumbnailUrl"
      :tile-source="tileSource"
      @drawing-cancel="handleDrawingCancel"
      @drawing-complete="handleDrawingComplete"
      @measurement-complete="handleMeasurementComplete"
      @measurement-delete="handleMeasurementDelete"
      @open="handleSlideOpened"
      @open-failed="handleSlideFailed"
      @pan="handlePanChanged"
      @roi-click="handleROIClick"
      @roi-delete="handleROIDelete"
      @roi-move="handleROIMove"
      @tile-loaded="handleTileLoaded"
      @viewer-ready="handleViewerReady"
      @viewport-change="handleViewportChange"
      @zoom="handleZoomChanged"
    />

  </div>
</template>

<script setup lang="ts">
  import type OpenSeadragon from 'openseadragon'
  import type { Slide } from '@/api/types'
  import type { MeasurementResult, ROI, ROICoordinates, ViewerSlide } from '@/composables/useViewer'
  import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { apiClient } from '@/api/client'
  import { slidesApi } from '@/api/slides'
  import DziViewer from '@/components/DziViewer.vue'
  import { useCases } from '@/composables/useCases'
  import { useAuthStore } from '@/stores/auth'
  import { useEdgeFirstTileSource } from '@/composables/useEdgeFirstTileSource'
  import { useSignedTileSource } from '@/composables/useSignedTileSource'
  import { useSlides } from '@/composables/useSlides'
  import { useViewer } from '@/composables/useViewer'
  import { deriveCaseName } from '@/utils/viewer-utils'

  // Define o layout específico para esta página
  definePage({
    meta: {
      layout: 'viewer',
    },
  })

  // Route and composables
  const route = useRoute()
  const viewerControls = useViewer()
  const casesStore = useCases()
  const slidesStore = useSlides()
  const signedTileSource = useSignedTileSource()
  const edgeFirstTileSource = useEdgeFirstTileSource()

  // Read-only mode (magic links)
  const isReadOnly = ref(false)
  provide('viewerReadOnly', isReadOnly)

  // Provide edge-first state to layout for TileSourceBadge
  provide('edgeFirstTileSource', {
    origin: edgeFirstTileSource.origin,
    edgeAgentId: edgeFirstTileSource.edgeAgentId,
    edgeAvailable: edgeFirstTileSource.edgeAvailable,
    fallbackReason: edgeFirstTileSource.fallbackReason,
    isLoading: edgeFirstTileSource.isLoading,
  })

  // Refs
  const dziViewerRef = ref<InstanceType<typeof DziViewer> | null>(null)
  const currentCase = ref<any>(null)
  const slides = ref<Slide[]>([])
  const currentSlideIndex = ref(0)

  // Loading skeleton state
  const hasLoadedData = ref(false)
  const isViewerReady = ref(false)

  // Progress tracking
  const processingProgress = ref(0)
  const processingJobState = ref<'active' | 'waiting' | null>(null)
  let progressPollingInterval: ReturnType<typeof setInterval> | null = null

  // Computed: current slide
  const currentSlide = computed(() => slides.value[currentSlideIndex.value] || null)

  // Helper to extract slideId from dziPath (e.g., "slides/{slideId}/{slideId}.dzi")
  function extractSlideIdFromDziPath (dziPath: string): string | null {
    const match = dziPath.match(/slides\/([^/]+)\//)
    return match?.[1] ?? null
  }

  // Check if slide is still being processed
  // If edge loaded tiles, don't show processing screen even if cloud says "processing"
  const isSlideProcessing = computed(() => {
    if (edgeFirstTileSource.tileSource.value) return false
    const status = currentSlide.value?.processingStatus
    return status === 'processing' || status === 'uploading' || status === 'pending'
  })

  // Processing stages definition
  const processingStages = [
    { label: 'Na fila', icon: 'mdi-clock-outline', range: [0, 5] },
    { label: 'Baixando', icon: 'mdi-cloud-download', range: [5, 10] },
    { label: 'Convertendo', icon: 'mdi-cog-sync', range: [10, 50] },
    { label: 'Enviando', icon: 'mdi-cloud-upload', range: [50, 95] },
    { label: 'Finalizando', icon: 'mdi-check-circle', range: [95, 100] },
  ]

  // Current processing stage index
  const currentStageIndex = computed(() => {
    const progress = processingProgress.value
    if (progress === 0 && processingJobState.value === 'waiting') return 0
    for (let i = processingStages.length - 1; i >= 0; i--) {
      const stage = processingStages[i]
      const rangeStart = stage?.range?.[0]
      if (stage && rangeStart !== undefined && progress >= rangeStart) return i
    }
    return 0
  })

  // Current stage icon
  const processingStageIcon = computed(() => {
    return processingStages[currentStageIndex.value]?.icon || 'mdi-cog-sync'
  })

  // Current stage title
  const processingStageTitle = computed(() => {
    const status = currentSlide.value?.processingStatus
    if (status === 'pending' || (processingProgress.value === 0 && processingJobState.value === 'waiting')) {
      return 'Aguardando na fila...'
    }
    const idx = currentStageIndex.value
    if (idx === 0) return 'Iniciando processamento...'
    if (idx === 1) return 'Baixando arquivo do servidor...'
    if (idx === 2) return 'Convertendo para formato DZI...'
    if (idx === 3) return 'Enviando tiles para o servidor...'
    if (idx === 4) return 'Finalizando processamento...'
    return 'Processando lâmina...'
  })

  // Current stage subtitle
  const processingStageSubtitle = computed(() => {
    const idx = currentStageIndex.value
    if (idx === 0) return 'A lâmina será processada em breve'
    if (idx === 1) return 'Preparando arquivo para conversão'
    if (idx === 2) return 'Gerando tiles de alta resolução - esta etapa pode demorar alguns minutos para arquivos grandes'
    if (idx === 3) return 'Enviando os tiles gerados para o armazenamento em nuvem'
    if (idx === 4) return 'Quase pronto! Verificando integridade dos dados'
    return 'Por favor, aguarde...'
  })

  // Time tracking for estimates
  const progressHistory = ref<Array<{ time: number, progress: number }>>([])

  // Estimated time remaining
  const estimatedTimeRemaining = computed(() => {
    const history = progressHistory.value
    if (history.length < 2 || processingProgress.value === 0) return null

    // Calculate average speed from last 5 samples
    const samples = history.slice(-5)
    if (samples.length < 2) return null

    const lastSample = samples[samples.length - 1]
    const firstSample = samples[0]
    if (!lastSample || !firstSample) return null

    const timeDiff = lastSample.time - firstSample.time
    const progressDiff = lastSample.progress - firstSample.progress

    if (progressDiff <= 0 || timeDiff <= 0) return null

    const remainingProgress = 100 - processingProgress.value
    const msPerPercent = timeDiff / progressDiff
    const remainingMs = remainingProgress * msPerPercent

    // Format time
    const seconds = Math.floor(remainingMs / 1000)
    if (seconds < 60) return `~${seconds} segundos restantes`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `~${minutes} minuto${minutes > 1 ? 's' : ''} restante${minutes > 1 ? 's' : ''}`
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    return `~${hours}h ${remainingMins}min restantes`
  })

  // Format file size
  function formatFileSize (bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Navigate to dashboard
  function goToDashboard () {
    const caseId = route.query.caseId as string
    window.location.href = caseId ? `/dashboard?caseId=${caseId}` : '/dashboard'
  }

  // Computed: tile source from current slide
  // Priority: edge-first > signed S3 > direct URL
  const tileSource = computed(() => {
    if (!currentSlide.value) return undefined

    // Priority 1: Edge-first tile source — available even when cloud says "processing"
    if (edgeFirstTileSource.tileSource.value) {
      return edgeFirstTileSource.tileSource.value
    }

    // For cloud-only sources, require "ready" status to avoid 404 loops
    const status = currentSlide.value.processingStatus
    if (status !== 'ready') return undefined

    // Priority 2: Signed S3 tile source (cloud API)
    if (signedTileSource.tileSource.value) {
      return signedTileSource.tileSource.value
    }

    // Priority 3: Direct URL (legacy)
    if (currentSlide.value.dziPath?.startsWith('http')) {
      return currentSlide.value.dziPath
    }

    // For S3-based slides, we need to wait for tile source to load
    return undefined
  })

  // ROIs from viewer state (set by layout) - empty when markers hidden
  const viewerROIs = computed<ROI[]>(() =>
    viewerControls.state.value.showMarkers ? viewerControls.state.value.activeROIs : [],
  )

  // Measurements from viewer state - empty when markers hidden
  const viewerMeasurements = computed<MeasurementResult[]>(() =>
    viewerControls.state.value.showMarkers ? viewerControls.state.value.activeMeasurements : [],
  )

  // Drawing mode from composable
  const drawingMode = computed(() => {
    const mode = viewerControls.drawingState.value.mode
    console.log('[ViewerPage] drawingMode computed:', mode)
    return mode
  })

  // Show empty state only for specific states (not for normal loading - DziViewer handles that)
  const showEmptyState = computed(() => {
    if (tileSource.value) return false
    if (!hasLoadedData.value) return false // skeleton handles the initial loading
    return !currentSlide.value || isSlideProcessing.value || currentSlide.value?.processingStatus === 'failed'
  })

  // Skeleton covers from mount until DziViewer opens (replaces blank screen + flash)
  const showSkeleton = computed(() => {
    if (showEmptyState.value) return false
    if (isViewerReady.value) return false
    return true
  })

  // Thumbnail URL for smooth loading placeholder
  // Priority: edge-first > cloud API
  const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://cloud.supernavi.app') + '/api'
  const currentThumbnailUrl = computed(() => {
    // Use edge-first thumbnail if available
    if (edgeFirstTileSource.thumbnailUrl.value) {
      return edgeFirstTileSource.thumbnailUrl.value
    }

    // Fall back to cloud API thumbnail
    if (!currentSlide.value?.thumbnailUrl) return ''
    const token = localStorage.getItem('supernavi_token')
    if (!token) return ''
    return `${API_BASE_URL}/slides/${currentSlide.value.id}/thumbnail?token=${encodeURIComponent(token)}`
  })

  // Track tiles for loading progress
  let totalTilesEstimate = 0
  let loadedTilesCount = 0

  // Event Handlers
  function handleViewerReady (viewer: OpenSeadragon.Viewer) {
    console.log('[ViewerPage] OpenSeadragon ready')

    if (dziViewerRef.value) {
      // Register viewer with composable
      viewerControls.registerViewer(dziViewerRef.value)

      // Set slide info from loaded case/slide data
      const caseName = deriveCaseName(currentSlide.value, currentCase.value)
      const slideName = currentSlide.value?.name || 'Lâmina'
      viewerControls.setSlideInfo(caseName, slideName)
      updateSlideMetadata(currentSlide.value)

      // Track mouse movement for coordinates
      viewer.addHandler('canvas-nonprimary-press', (event: any) => {
        const viewportPoint = viewer.viewport.pointFromPixel(event.position)
        const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint)

        viewerControls.updateMouseCoords({
          x: Math.round(imagePoint.x),
          y: Math.round(imagePoint.y),
        })
      })

      viewer.addHandler('canvas-drag', (event: any) => {
        if (event.position) {
          const viewportPoint = viewer.viewport.pointFromPixel(event.position)
          const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint)

          viewerControls.updateMouseCoords({
            x: Math.round(imagePoint.x),
            y: Math.round(imagePoint.y),
          })
        }
      })

      viewer.addHandler('canvas-exit', () => {
        viewerControls.updateMouseCoords(null)
      })
    }
  }

  function handleSlideOpened (event: OpenSeadragon.ViewerEvent) {
    console.log('[ViewerPage] Slide loaded successfully')
    isViewerReady.value = true
    viewerControls.state.value.isLoading = false
    viewerControls.state.value.isReady = true

    // Set magnification metadata from manifest or slide data
    const manifest = edgeFirstTileSource.manifest.value
    if (manifest) {
      viewerControls.setMagnificationMetadata(
        manifest.appMag ?? null,
        manifest.mpp ?? null,
        manifest.width,
        manifest.height,
      )
    } else {
      // Fallback: compute magnification from slide API data + DZI preview dimensions
      const slide = currentSlide.value
      const meta = signedTileSource.metadata.value
      if (slide && meta && slide.width && slide.height) {
        const originalMpp = slide.mpp ? parseFloat(slide.mpp) : null
        // Scale mpp from original to preview resolution
        const scaleFactor = Math.max(slide.width, slide.height) / Math.max(meta.width, meta.height)
        const previewMpp = originalMpp ? originalMpp * scaleFactor : null
        // appMag: 10/mpp is a rough approximation of objective magnification
        const previewAppMag = previewMpp ? Math.round(10 / previewMpp * 10) / 10 : null
        viewerControls.setMagnificationMetadata(previewAppMag, previewMpp, meta.width, meta.height)
      }
    }

    // Estimate total tiles based on pyramid structure
    if (dziViewerRef.value?.viewer) {
      const tiledImage = dziViewerRef.value.viewer.world.getItemAt(0)
      if (tiledImage) {
        const source = tiledImage.source as any
        // Rough estimate: sum of tiles at all levels
        totalTilesEstimate = 0
        if (source.maxLevel && source.dimensions && source.tileSize) {
          for (let level = 0; level < source.maxLevel; level++) {
            const levelWidth = Math.ceil(source.dimensions.x / Math.pow(2, source.maxLevel - level) / source.tileSize)
            const levelHeight = Math.ceil(source.dimensions.y / Math.pow(2, source.maxLevel - level) / source.tileSize)
            totalTilesEstimate += levelWidth * levelHeight
          }
          viewerControls.state.value.totalTiles = totalTilesEstimate
        }
      }
    }

    // Get initial zoom
    const zoom = dziViewerRef.value?.getZoom()
    if (zoom) {
      viewerControls.updateZoom(zoom)
    }
  }

  function handleSlideFailed (event: OpenSeadragon.ViewerEvent) {
    console.error('[ViewerPage] Failed to load slide')
    viewerControls.state.value.isLoading = false
    viewerControls.state.value.isReady = false
  }

  function handleZoomChanged (event: OpenSeadragon.ViewerEvent) {
    const zoom = dziViewerRef.value?.getZoom()
    if (zoom) {
      viewerControls.updateZoom(zoom)
    }
  }

  function handlePanChanged (event: OpenSeadragon.ViewerEvent) {
  // Could track pan position here if needed
  }

  function handleROIClick (roiId: number) {
    console.log('[ViewerPage] ROI clicked:', roiId)
    // Trigger the callback registered via onROIClick
    viewerControls.handleROIClick(roiId)
  }

  function handleROIMove (roiId: number, newCoordinates: { x: number, y: number, width: number, height: number }) {
    console.log('[ViewerPage] ROI moved:', roiId, newCoordinates)
    viewerControls.updateROICoordinates(roiId, newCoordinates)
  }

  function handleROIDelete (roiId: number) {
    console.log('[ViewerPage] ROI delete requested:', roiId)
    viewerControls.handleROIDelete(roiId)
  }

  function handleDrawingComplete (coordinates: ROICoordinates, type: 'rectangle' | 'arrow') {
    console.log('[ViewerPage] Drawing complete:', type, coordinates)
    // Call composable handler which triggers callback registered by layout
    viewerControls.handleDrawingComplete(coordinates, type)
  }

  function handleDrawingCancel () {
    console.log('[ViewerPage] Drawing cancelled')
    viewerControls.cancelDrawing()
  }

  function handleMeasurementComplete (result: Omit<MeasurementResult, 'id'>) {
    console.log('[ViewerPage] Measurement complete:', result)
    viewerControls.handleMeasurementComplete(result as MeasurementResult)
  }

  function handleMeasurementDelete (measurementId: number) {
    console.log('[ViewerPage] Measurement delete requested:', measurementId)
    viewerControls.deleteMeasurement(measurementId)
  }

  function handleTileLoaded (event: OpenSeadragon.ViewerEvent) {
    loadedTilesCount++
    viewerControls.updateTilesLoaded(loadedTilesCount)
  }

  function handleViewportChange (viewport: OpenSeadragon.Viewport) {
    const zoom = viewport.getZoom()
    viewerControls.updateZoom(zoom)
  }

  // Load tile source for a slide using edge-first strategy
  // Priority: local edge > cloud preview > signed S3
  async function loadSlideWithEdgeFirst (slide: Slide) {
    const slideId = slide.id

    // Try edge-first if configured — edge can serve tiles even if cloud says "processing"
    // because the edge has local tiles ready before the remote preview upload finishes
    if (edgeFirstTileSource.isEdgeConfigured.value) {
      console.log('[ViewerPage] Trying edge-first for slide:', slideId)
      try {
        await edgeFirstTileSource.load(slideId)
        console.log('[ViewerPage] Edge-first loaded successfully, origin:', edgeFirstTileSource.origin.value)
        return // Success - no need for fallback
      } catch (error) {
        console.warn('[ViewerPage] Edge-first failed, falling back to signed URLs:', error)
      }
    }

    // Fallback to signed S3 URLs (only when cloud confirms ready — incomplete uploads cause 404 loops)
    if (slide.processingStatus !== 'ready') {
      console.log('[ViewerPage] Slide not ready on cloud and edge unavailable, skipping S3 fallback')
      return
    }
    if (!slide.dziPath) {
      console.log('[ViewerPage] No dziPath available, cannot load from S3')
      return
    }

    // Extract slideId from dziPath (format: "slides/{slideId}/{slideId}.dzi")
    const s3SlideId = extractSlideIdFromDziPath(slide.dziPath)
    if (!s3SlideId) {
      console.log('[ViewerPage] Could not extract slideId from dziPath:', slide.dziPath)
      return
    }

    console.log('[ViewerPage] Loading signed tile source for slide:', s3SlideId)
    try {
      await signedTileSource.load({ slideId: s3SlideId })
      console.log('[ViewerPage] Signed tile source loaded successfully')
    } catch (error) {
      console.error('[ViewerPage] Failed to load signed tile source:', error)
    }
  }

  // Alias for backward compatibility
  const loadSlideWithSignedUrls = loadSlideWithEdgeFirst

  // Poll for processing progress
  async function pollProgress () {
    const slide = currentSlide.value
    if (!slide) return

    // Only poll if slide is processing or uploading
    if (slide.processingStatus !== 'processing' && slide.processingStatus !== 'uploading' && slide.processingStatus !== 'pending') {
      stopProgressPolling()
      return
    }

    try {
      const progressData = await slidesApi.getProgress(slide.id)
      const newProgress = progressData.progress
      processingProgress.value = newProgress
      processingJobState.value = progressData.jobState || null

      // Track progress history for time estimates
      if (newProgress > 0) {
        progressHistory.value.push({ time: Date.now(), progress: newProgress })
        // Keep only last 20 samples
        if (progressHistory.value.length > 20) {
          progressHistory.value.shift()
        }
      }

      console.log('[ViewerPage] Progress:', progressData.progress, '%', progressData.jobState)

      // Only load tile source when FULLY ready (not uploading)
      if (progressData.status === 'ready') {
        console.log('[ViewerPage] Slide ready, loading...')
        // Reload slide data to get updated dziPath
        const updatedSlide = await slidesApi.get(slide.id)
        // Update the slide in our local array
        const idx = slides.value.findIndex(s => s.id === slide.id)
        if (idx !== -1) {
          slides.value[idx] = updatedSlide
        }
        // Try to load tile source
        if (updatedSlide.dziPath) {
          await loadSlideWithSignedUrls(updatedSlide)
        }
        stopProgressPolling()
        // Clear progress history
        progressHistory.value = []
      } else if (progressData.status === 'failed') {
        console.log('[ViewerPage] Slide processing failed')
        stopProgressPolling()
        // Update slide status
        const updatedSlide = await slidesApi.get(slide.id)
        const idx = slides.value.findIndex(s => s.id === slide.id)
        if (idx !== -1) {
          slides.value[idx] = updatedSlide
        }
      }
    } catch (error) {
      console.error('[ViewerPage] Failed to poll progress:', error)
    }
  }

  function startProgressPolling () {
    if (progressPollingInterval) return
    console.log('[ViewerPage] Starting progress polling')
    pollProgress() // Initial poll
    progressPollingInterval = setInterval(pollProgress, 2000) // Poll every 2 seconds
  }

  function stopProgressPolling () {
    if (progressPollingInterval) {
      console.log('[ViewerPage] Stopping progress polling')
      clearInterval(progressPollingInterval)
      progressPollingInterval = null
    }
  }

  // Convert API Slide to ViewerSlide format for the layout
  function convertToViewerSlide (slide: Slide): ViewerSlide {
    return {
      id: slide.id,
      name: slide.name,
      stain: slide.fileFormat?.toUpperCase() || 'H&E', // Use file format or default
      tileSource: slide.dziPath || '',
    }
  }

  // Push slide metadata to shared viewer state (layout reads it)
  function updateSlideMetadata (slide: Slide | null) {
    viewerControls.state.value.slideMetadata = slide
      ? {
          originalFilename: slide.originalFilename,
          fileFormat: slide.fileFormat,
          fileSize: slide.fileSize,
          uploadedAt: slide.uploadedAt,
          processedAt: slide.processedAt,
          externalCaseBase: slide.externalCaseBase ?? null,
        }
      : null
  }

  // deriveCaseName imported from @/utils/viewer-utils

  // Decode JWT payload without verification (server already signed it)
  function decodeJwtPayload (token: string): Record<string, any> | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null
      return JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')))
    } catch {
      return null
    }
  }

  // Magic link support: load slide directly with token, no case needed
  async function loadFromMagicLink (slideId: string, token: string) {
    const authStore = useAuthStore()
    const userIsAuthenticated = authStore.isAuthenticated && apiClient.getToken()

    console.log('[ViewerPage] Loading via magic link, slideId:', slideId, 'userAuth:', !!userIsAuthenticated)

    // Decode JWT payload once
    const payload = decodeJwtPayload(token)

    // Populate user identity from magic link JWT if auth store is empty
    if (!authStore.isAuthenticated) {
      if (payload?.userId) {
        authStore.user = {
          id: payload.userId,
          name: payload.userName || 'Usuário',
          email: '',
          role: 'pathologist',
          avatar: payload.userAvatar || undefined,
          createdAt: new Date(),
          edgeId: payload.edgeId || null,
        }
        authStore.isAuthenticated = true
      }
    }

    // Extract patient data from JWT (scraped by extension from PathoWeb)
    if (payload?.patientData) {
      viewerControls.state.value.patientData = payload.patientData
    }

    // Only read-only if user is NOT identified at all
    if (!authStore.isAuthenticated) {
      isReadOnly.value = true
    }

    // Only use magic token if user has no real session
    const previousToken = apiClient.getToken()
    if (!userIsAuthenticated) {
      apiClient.setToken(token)
    }

    try {
      const slide = await slidesApi.get(slideId)
      slides.value = [slide]
      currentSlideIndex.value = 0

      viewerControls.setSlides([convertToViewerSlide(slide)])
      viewerControls.setActiveSlideId(slide.id)
      viewerControls.setSlideInfo(deriveCaseName(slide), slide.name)
      updateSlideMetadata(slide)

      if (slide.processingStatus === 'ready') {
        await loadSlideWithEdgeFirst(slide)
      } else if (edgeFirstTileSource.isEdgeConfigured.value) {
        // Edge can serve tiles locally even if cloud says "processing" (preview upload in progress)
        await loadSlideWithEdgeFirst(slide)
        // If edge didn't load, fall back to processing screen
        if (!edgeFirstTileSource.tileSource.value) {
          startProgressPolling()
        }
      } else if (slide.processingStatus === 'processing' || slide.processingStatus === 'pending') {
        startProgressPolling()
      }

      // Load case record (if auto-created) to get persisted patient data
      if (slide.caseId) {
        try {
          const caseRecord = await casesStore.getCase(slide.caseId)
          if (caseRecord) {
            currentCase.value = caseRecord
            // Use persisted case data as primary source (overrides JWT patientData)
            const pd: Record<string, string> = {}
            if (caseRecord.patientName) pd.patientName = caseRecord.patientName
            if (caseRecord.caseNumber) pd.patientId = caseRecord.caseNumber
            if (caseRecord.patientAge != null) pd.age = String(caseRecord.patientAge)
            if (caseRecord.doctor) pd.doctor = caseRecord.doctor
            if (Object.keys(pd).length > 0) {
              viewerControls.state.value.patientData = pd
            }
            // Update case name in header
            viewerControls.setSlideInfo(deriveCaseName(slide, caseRecord), slide.name)
          }
        } catch (err) {
          console.warn('[ViewerPage] Could not load case record:', err)
        }
      }

      // Load all sibling slides for the same case (enables slide switching)
      try {
        let allSlides: typeof slides.value = []
        if (slide.caseId) {
          allSlides = await casesStore.getCaseSlides(slide.caseId)
        } else if (slide.externalCaseBase) {
          allSlides = await slidesApi.getByCaseBase(slide.externalCaseBase)
        }
        if (allSlides.length > 1) {
          slides.value = allSlides
          currentSlideIndex.value = allSlides.findIndex(s => s.id === slide.id)
          viewerControls.setSlides(allSlides.map(convertToViewerSlide))
          viewerControls.setActiveSlideId(slide.id)
          console.log('[ViewerPage] Loaded', allSlides.length, 'sibling slides')
        }
      } catch (err) {
        console.warn('[ViewerPage] Could not load case slides:', err)
      }
    } catch (error) {
      console.error('[ViewerPage] Magic link load failed:', error)
      // Restore previous token if magic link fails
      if (!userIsAuthenticated) {
        if (previousToken) {
          apiClient.setToken(previousToken)
        } else {
          apiClient.clearToken()
        }
      }
    }
  }

  // Load case and slides from API
  async function loadCaseData () {
    const caseId = route.query.caseId as string
    const slideId = route.query.slideId as string
    const magicToken = route.query.t as string

    // Handle magic link access (no auth required)
    if (magicToken && slideId) {
      await loadFromMagicLink(slideId, magicToken)
      return
    }

    if (caseId) {
      console.log('[ViewerPage] Loading case:', caseId)

      // Load case details
      currentCase.value = await casesStore.getCase(caseId)

      if (currentCase.value) {
        // Populate patient data from case record (works for dashboard navigation)
        const c = currentCase.value
        const pd: Record<string, string> = {}
        if (c.patientName) pd.patientName = c.patientName
        if (c.caseNumber) pd.patientId = c.caseNumber
        if (c.patientAge != null) pd.age = String(c.patientAge)
        if (c.doctor) pd.doctor = c.doctor
        if (Object.keys(pd).length > 0) {
          viewerControls.state.value.patientData = pd
        }
        // Load slides for this case
        slides.value = await casesStore.getCaseSlides(caseId)

        // Convert to ViewerSlide format and set in composable for the layout
        const viewerSlides = slides.value.map(convertToViewerSlide)
        viewerControls.setSlides(viewerSlides)
        console.log('[ViewerPage] Set viewer slides:', viewerSlides.length)

        // If a specific slide was requested, find it
        if (slideId && slides.value.length > 0) {
          const slideIndex = slides.value.findIndex(s => s.id === slideId)
          if (slideIndex !== -1) {
            currentSlideIndex.value = slideIndex
          }
        }

        // Set active slide in composable
        if (currentSlide.value) {
          viewerControls.setActiveSlideId(currentSlide.value.id)
        }

        // Load annotations for current slide
        if (currentSlide.value) {
          await slidesStore.fetchAnnotations(currentSlide.value.id)

          // Load signed tile source if slide has dziPath (S3)
          await loadSlideWithSignedUrls(currentSlide.value)

          // Start polling if slide is processing
          if (currentSlide.value.processingStatus === 'processing'
            || currentSlide.value.processingStatus === 'pending'
            || currentSlide.value.processingStatus === 'uploading') {
            startProgressPolling()
          }
        }

        console.log('[ViewerPage] Case loaded:', currentCase.value.caseNumber)
        console.log('[ViewerPage] Slides:', slides.value.length)
      }
    } else {
      console.log('[ViewerPage] No caseId, using test slide')
    }
  }

  // Handle slide change from layout (when user selects a different slide)
  function handleSlideChangeFromLayout (slideId: string) {
    const slideIndex = slides.value.findIndex(s => s.id === slideId)
    if (slideIndex !== -1 && slideIndex !== currentSlideIndex.value) {
      console.log('[ViewerPage] Slide changed from layout:', slideId)
      currentSlideIndex.value = slideIndex
      // The watch on currentSlide will handle loading signed URLs
    }
  }

  // Lifecycle
  onMounted(async () => {
    viewerControls.state.value.isLoading = true
    console.log('[ViewerPage] Mounted')

    // Restore user session from storage (needed for magic links that skip router auth)
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      await authStore.initFromStorage()
    }

    // Register callback for when layout changes the active slide
    viewerControls.onSlideChange(handleSlideChangeFromLayout)

    // Load case data from API
    await loadCaseData()
    hasLoadedData.value = true
  })

  onBeforeUnmount(() => {
    stopProgressPolling()
    viewerControls.unregisterViewer()
    edgeFirstTileSource.clear()
    signedTileSource.clearCache()
    console.log('[ViewerPage] Unmounted')
  })

  // Watch for case changes to update slide info in the header
  watch(currentCase, newCase => {
    if (newCase) {
      const caseName = deriveCaseName(currentSlide.value, newCase)
      const slideName = currentSlide.value?.name || 'Lâmina'
      viewerControls.setSlideInfo(caseName, slideName)
      console.log('[ViewerPage] Updated case name:', caseName)
    }
  })

  // Watch for slide changes to load new tile source (edge-first)
  watch(currentSlide, async (newSlide, oldSlide) => {
    if (newSlide && newSlide.id !== oldSlide?.id) {
      console.log('[ViewerPage] Slide changed, loading tile source (edge-first)...')

      // Reset viewer ready state for skeleton
      isViewerReady.value = false

      // Clear previous tile sources
      edgeFirstTileSource.clear()
      signedTileSource.clearCache()

      // Update active slide ID in composable (so layout stays in sync)
      viewerControls.setActiveSlideId(newSlide.id)

      // Load new tile source with edge-first strategy
      await loadSlideWithEdgeFirst(newSlide)

      // Also update slide name in header
      const caseName = deriveCaseName(newSlide, currentCase.value)
      viewerControls.setSlideInfo(caseName, newSlide.name)
      updateSlideMetadata(newSlide)
    }
  })

  // Watch for tile source changes
  watch(tileSource, newSource => {
    console.log('[ViewerPage] Tile source changed:', typeof newSource === 'object' ? 'Custom tile source' : newSource)
    loadedTilesCount = 0
    totalTilesEstimate = 0
    viewerControls.state.value.tilesLoaded = 0
    viewerControls.state.value.totalTiles = 0
    viewerControls.state.value.isLoading = true
  })
</script>

<style scoped lang="scss">
.viewer-page {
  width: 100%;
  height: 100%;
  position: relative;
  background: rgb(var(--v-theme-surface));
}

// Empty State
.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background: rgb(var(--v-theme-surface));
}

.empty-state-content {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 400px;
  padding: 2rem;
}

.empty-state-icon {
  margin-bottom: 1.5rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.empty-state-title {
  font-size: 1.5rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 0.75rem;
  opacity: 0.9;
}

.empty-state-description {
  font-size: 0.95rem;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
  line-height: 1.6;
  margin: 0;
}

// Processing Container (detailed progress UI)
.processing-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 480px;
  padding: 2rem;
}

.processing-icon-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.processing-icon-bg {
  position: absolute;
  inset: 0;
  background: rgba(var(--v-theme-primary), 0.08);
  border-radius: 50%;
  animation: pulse-bg 2s ease-in-out infinite;
}

.processing-icon {
  position: relative;
  z-index: 1;
}

.icon-pulse {
  animation: icon-pulse 1.5s ease-in-out infinite;
}

@keyframes pulse-bg {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes icon-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

// Stage Indicator
.processing-stages {
  display: flex;
  gap: 8px;
  margin-bottom: 2rem;
}

.stage-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 60px;
}

.stage-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.4);
  transition: all 0.3s ease;
}

.stage-label {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  white-space: nowrap;
  transition: all 0.3s ease;
}

.stage-active .stage-dot {
  background: rgb(var(--v-theme-primary));
  color: white;
  box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.2);
}

.stage-active .stage-label {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.stage-complete .stage-dot {
  background: rgb(var(--v-theme-success));
  color: white;
}

.stage-complete .stage-label {
  color: rgb(var(--v-theme-success));
}

// Main Progress Info
.processing-main {
  text-align: center;
  margin-bottom: 1.5rem;
}

.processing-title {
  font-size: 1.4rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  margin: 0 0 0.5rem;
}

.processing-subtitle {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 0;
  max-width: 400px;
  line-height: 1.5;
}

// Progress Bar Container
.processing-progress-container {
  width: 100%;
  max-width: 360px;
  margin-bottom: 1.5rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.progress-percent {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.progress-footer {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}

.time-estimate {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

// File Info
.file-info {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-bottom: 1rem;
}

.file-size {
  margin-left: 4px;
  opacity: 0.7;
}

// Processing Tip
.processing-tip {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  background: rgba(var(--v-theme-primary), 0.05);
  border-radius: 8px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  max-width: 360px;
  text-align: left;
  line-height: 1.5;
}

.empty-state-progress {
  margin-top: 1.5rem;
  max-width: 200px;
  margin-inline: auto;
}

.empty-state-background {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  opacity: 0.03;
}

.grid-pattern {
  position: absolute;
  inset: -50%;
  background-image:
    linear-gradient(rgb(var(--v-theme-primary)) 1px, transparent 1px),
    linear-gradient(90deg, rgb(var(--v-theme-primary)) 1px, transparent 1px);
  background-size: 40px 40px;
  transform: rotate(-5deg);
}

// Loading Skeleton
.viewer-skeleton {
  position: absolute;
  inset: 0;
  z-index: 15;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-surface));
  gap: 24px;
}

.skeleton-slide-area {
  width: min(60%, 480px);
  aspect-ratio: 4 / 3;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  overflow: hidden;
  position: relative;
}

.skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 30%,
    rgba(var(--v-theme-on-surface), 0.04) 50%,
    transparent 70%
  );
  animation: skeleton-shimmer 1.8s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.skeleton-caption {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-weight: 500;
}

.skeleton-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(var(--v-theme-primary), 0.15);
  border-top-color: rgb(var(--v-theme-primary));
  border-radius: 50%;
  animation: skeleton-spin 0.8s linear infinite;
}

@keyframes skeleton-spin {
  to { transform: rotate(360deg); }
}

.skeleton-fade-leave-active {
  transition: opacity 0.4s ease;
}

.skeleton-fade-leave-to {
  opacity: 0;
}

// Fade transition
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// Processing Banner
.processing-banner {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none;
}

.processing-banner-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(44, 95, 141, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 24px;
  color: white;
  font-size: 13px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  flex-wrap: wrap;
  justify-content: center;
  max-width: 90vw;
}

.processing-text {
  white-space: nowrap;
}

.processing-hint {
  opacity: 0.7;
  font-size: 11px;
  white-space: nowrap;
}

.processing-progress {
  width: 100%;
  margin-top: 6px;
}

// Slide up transition
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
