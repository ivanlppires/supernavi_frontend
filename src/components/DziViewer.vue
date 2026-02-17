<template>
  <div class="dzi-viewer-wrapper">
    <!-- Thumbnail Placeholder (shows while tiles load) -->
    <Transition name="thumbnail-fade">
      <div
        v-if="showThumbnailPlaceholder && thumbnailUrl"
        class="thumbnail-placeholder"
      >
        <img
          alt="Prévia da lâmina"
          class="thumbnail-image"
          :src="thumbnailUrl"
          @error="onThumbnailError"
          @load="onThumbnailLoad"
        >
        <div class="thumbnail-loading-indicator">
          <v-progress-circular
            color="white"
            indeterminate
            :size="32"
            :width="2"
          />
          <span class="loading-text">Carregando tiles...</span>
        </div>
      </div>
    </Transition>

    <!-- Loading Overlay (shows before thumbnail or if no thumbnail) -->
    <v-fade-transition>
      <div v-if="showInitialLoading" class="loading-overlay">
        <div class="loading-content">
          <v-progress-circular
            class="mb-4"
            color="primary"
            indeterminate
            :size="64"
            :width="3"
          />
          <div class="text-h6 text-primary mb-2">Carregando Lâmina...</div>
          <div class="text-caption text-medium-emphasis">
            Preparando visualização de alta resolução
          </div>
        </div>
      </div>
    </v-fade-transition>

    <!-- Viewer Container -->
    <div
      ref="containerRef"
      class="dzi-viewer-container"
      :class="{ 'viewer-loading': !isFullyReady }"
    />
  </div>
</template>

<script setup lang="ts">
  import type { DrawingMode, MeasurementResult, ROI, ROICoordinates } from '@/composables/useViewer'
  import { useEdgeFirstTileSource } from '@/composables/useEdgeFirstTileSource'
  import OpenSeadragon from 'openseadragon'
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

  // Props
  interface DziViewerProps {
    /**
     * URL to the DZI file or tile source configuration
     */
    tileSource?: string | object | object[]

    /**
     * Prefix URL for OpenSeadragon UI images (navigator, etc.)
     */
    prefixUrl?: string

    /**
     * Show navigator (mini-map)
     */
    showNavigator?: boolean

    /**
     * Show full page button
     */
    showFullPageControl?: boolean

    /**
     * Show home button
     */
    showHomeControl?: boolean

    /**
     * Show zoom controls
     */
    showZoomControl?: boolean

    /**
     * Animation time in seconds
     */
    animationTime?: number

    /**
     * Blend time in seconds
     */
    blendTime?: number

    /**
     * Constrain during pan
     */
    constrainDuringPan?: boolean

    /**
     * Visibility ratio (0-1)
     */
    visibilityRatio?: number

    /**
     * Minimum zoom level
     */
    minZoomLevel?: number

    /**
     * Maximum zoom level (absolute OSD zoom value, undefined = use maxZoomPixelRatio)
     */
    maxZoomLevel?: number

    /**
     * Maximum ratio between 1 image pixel and 1 screen pixel.
     * Limits zoom based on actual image resolution.
     */
    maxZoomPixelRatio?: number

    /**
     * Default zoom level
     */
    defaultZoomLevel?: number

    /**
     * Enable rotation
     */
    degrees?: number

    /**
     * Enable image smoothing
     */
    imageSmoothingEnabled?: boolean

    /**
     * Preserve viewport on resize
     */
    preserveViewport?: boolean

    /**
     * Crosshairs enabled
     */
    showNavigationControl?: boolean

    /**
     * Timeout before hiding controls (ms)
     */
    controlsFadeDelay?: number

    /**
     * Mouse navigation enabled
     */
    mouseNavEnabled?: boolean

    /**
     * Show sequence controls (for multiple images)
     */
    showSequenceControl?: boolean

    /**
     * Preload next/previous images in sequence
     */
    preloadSequence?: boolean

    /**
     * ROIs to display as overlays
     */
    rois?: ROI[]

    /**
     * ID of the currently selected ROI
     */
    selectedROIId?: number | null

    /**
     * Drawing mode for creating new ROIs
     */
    drawingMode?: DrawingMode

    /**
     * Persistent measurements to display
     */
    measurements?: MeasurementResult[]

    /**
     * Thumbnail URL to show as placeholder while tiles load
     */
    thumbnailUrl?: string

    /**
     * Minimum number of tiles to load before revealing viewer
     */
    minTilesToLoad?: number

    /**
     * Maximum time to wait for tiles before revealing viewer (ms)
     */
    maxWaitTime?: number
  }

  const props = withDefaults(defineProps<DziViewerProps>(), {
    tileSource: '/data/test.dzi',
    prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
    showNavigator: true,
    showFullPageControl: false, // We handle fullscreen in layout
    showHomeControl: false, // We have this in floating toolbar
    showZoomControl: false, // We have this in floating toolbar
    animationTime: 0.8,
    blendTime: 0.1,
    constrainDuringPan: true,
    visibilityRatio: 1,
    minZoomLevel: 0.5,
    maxZoomLevel: 50,
    maxZoomPixelRatio: 4,
    defaultZoomLevel: 1,
    degrees: 0,
    imageSmoothingEnabled: true,
    preserveViewport: true,
    showNavigationControl: false,
    controlsFadeDelay: 2000,
    mouseNavEnabled: true,
    showSequenceControl: false,
    preloadSequence: true,
    rois: () => [],
    selectedROIId: null,
    drawingMode: 'none',
    measurements: () => [],
    thumbnailUrl: '',
    minTilesToLoad: 8,
    maxWaitTime: 5000,
  })

  // Emits
  interface DziViewerEmits {
    (e: 'viewer-ready', viewer: OpenSeadragon.Viewer): void
    (e: 'open', event: OpenSeadragon.ViewerEvent): void
    (e: 'open-failed', event: OpenSeadragon.ViewerEvent): void
    (e: 'tile-loaded', event: OpenSeadragon.ViewerEvent): void
    (e: 'zoom', event: OpenSeadragon.ViewerEvent): void
    (e: 'pan', event: OpenSeadragon.ViewerEvent): void
    (e: 'rotate', event: OpenSeadragon.ViewerEvent): void
    (e: 'animation-start', event: OpenSeadragon.ViewerEvent): void
    (e: 'animation-finish', event: OpenSeadragon.ViewerEvent): void
    (e: 'canvas-click', event: OpenSeadragon.ViewerEvent): void
    (e: 'canvas-drag', event: OpenSeadragon.ViewerEvent): void
    (e: 'viewport-change', viewport: OpenSeadragon.Viewport): void
    (e: 'update-viewport', viewport: OpenSeadragon.Viewport): void
    (e: 'full-screen', isFullScreen: boolean): void
    (e: 'roi-click', roiId: number): void
    (e: 'roi-move', roiId: number, newCoordinates: { x: number, y: number, width: number, height: number }): void
    (e: 'roi-delete', roiId: number): void
    (e: 'drawing-complete', coordinates: ROICoordinates, type: 'rectangle' | 'arrow'): void
    (e: 'drawing-cancel'): void
    (e: 'measurement-complete', result: Omit<MeasurementResult, 'id'>): void
    (e: 'measurement-delete', measurementId: number): void
  }

  const emit = defineEmits<DziViewerEmits>()

  // ROI overlay elements map
  const roiOverlays = ref<Map<number, HTMLElement>>(new Map())

  // Drag state
  const isDraggingROI = ref(false)
  const draggedROIId = ref<number | null>(null)
  const draggedROIType = ref<'rectangle' | 'arrow' | null>(null)
  const dragStartPoint = ref<{ x: number, y: number } | null>(null)
  const dragStartViewportRect = ref<OpenSeadragon.Rect | null>(null)
  const dragStartViewportPoint = ref<OpenSeadragon.Point | null>(null)

  // Drawing state
  const isDrawing = ref(false)
  const drawingStartPoint = ref<{ x: number, y: number } | null>(null)
  const drawingPreviewElement = ref<HTMLElement | null>(null)

  // Measurement state
  const measurementOverlay = ref<Element | null>(null)
  const measurementEndPoint = ref<{ x: number, y: number } | null>(null)

  // Persistent measurement overlays map
  const measurementOverlays = ref<Map<number, HTMLElement>>(new Map())

  // Animation state - used to hide overlays during zoom/pan animations
  const isAnimating = ref(false)

  // Refs
  const containerRef = ref<HTMLDivElement | null>(null)
  const viewer = ref<OpenSeadragon.Viewer | null>(null)
  const isReady = ref(false)

  // Tile loading state for smooth reveal
  const tilesLoaded = ref(0)
  const isFullyReady = ref(false)
  const thumbnailLoaded = ref(false)
  const thumbnailFailed = ref(false)
  const waitTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null)

  // Computed states for loading UI
  const showThumbnailPlaceholder = computed(() => {
    // Show thumbnail while tiles are loading (after DZI opened but before fully ready)
    return isReady.value && !isFullyReady.value && (thumbnailLoaded.value || !props.thumbnailUrl)
  })

  const showInitialLoading = computed(() => {
    // Never show loading if viewer is fully ready
    if (isFullyReady.value) return false
    // Show initial loading only before DZI is opened OR if thumbnail is still loading
    if (!isReady.value) return true
    if (props.thumbnailUrl && !thumbnailLoaded.value && !thumbnailFailed.value) return true
    return false
  })

  // Thumbnail event handlers
  function onThumbnailLoad () {
    console.log('[DziViewer] Thumbnail loaded')
    thumbnailLoaded.value = true
  }

  function onThumbnailError () {
    console.log('[DziViewer] Thumbnail failed to load')
    thumbnailFailed.value = true
  }

  // Check if enough tiles loaded to reveal viewer
  function checkTilesReady () {
    if (isFullyReady.value) return

    if (tilesLoaded.value >= props.minTilesToLoad) {
      console.log(`[DziViewer] Enough tiles loaded (${tilesLoaded.value}/${props.minTilesToLoad}), revealing viewer`)
      revealViewer()
    }
  }

  // Reveal viewer with smooth transition
  function revealViewer () {
    if (isFullyReady.value) return

    // Clear timeout if exists
    if (waitTimeoutId.value) {
      clearTimeout(waitTimeoutId.value)
      waitTimeoutId.value = null
    }

    // Small delay for smoother transition
    setTimeout(() => {
      isFullyReady.value = true
      console.log('[DziViewer] Viewer fully revealed')
    }, 100)
  }

  // Start wait timeout when DZI opens
  function startWaitTimeout () {
    if (waitTimeoutId.value) {
      clearTimeout(waitTimeoutId.value)
    }

    waitTimeoutId.value = setTimeout(() => {
      if (!isFullyReady.value) {
        console.log(`[DziViewer] Max wait time (${props.maxWaitTime}ms) reached, revealing viewer anyway`)
        revealViewer()
      }
    }, props.maxWaitTime)
  }

  // Computed
  const viewerOptions = computed(() => {
    // Extract ajaxHeaders from tileSource if it's an object with that property
    const tileSourceObj = props.tileSource as any
    const ajaxHeaders = tileSourceObj?.ajaxHeaders || {}

    return {
      element: containerRef.value!,
      prefixUrl: props.prefixUrl,
      tileSources: props.tileSource as any,
      showNavigator: props.showNavigator,
      showFullPageControl: props.showFullPageControl,
      showHomeControl: props.showHomeControl,
      showZoomControl: props.showZoomControl,
      animationTime: props.animationTime,
      blendTime: props.blendTime,
      constrainDuringPan: props.constrainDuringPan,
      visibilityRatio: props.visibilityRatio,
      minZoomLevel: props.minZoomLevel,
      maxZoomLevel: props.maxZoomLevel,
      maxZoomPixelRatio: props.maxZoomPixelRatio,
      defaultZoomLevel: props.defaultZoomLevel,
      degrees: props.degrees,
      imageSmoothingEnabled: props.imageSmoothingEnabled,
      preserveViewport: props.preserveViewport,
      showNavigationControl: props.showNavigationControl,
      controlsFadeDelay: props.controlsFadeDelay,
      mouseNavEnabled: props.mouseNavEnabled,
      showSequenceControl: props.showSequenceControl,
      preloadSequence: props.preloadSequence,
      // Enable AJAX tile loading for custom headers (auth)
      loadTilesWithAjax: true,
      // Pass auth headers from tileSource to viewer
      ajaxHeaders,
      // Navigator options for better appearance
      navigatorPosition: 'BOTTOM_RIGHT' as const,
      navigatorSizeRatio: 0.15,
      navigatorMaintainSizeRatio: true,
      navigatorBorderColor: '#2C5F8D',
      navigatorDisplayRegionColor: 'rgba(76, 175, 80, 0.4)',
      // Smoother tile transitions
      placeholderFillStyle: '#1a1a1a',
      opacity: 1,
      immediateRender: false,
      // Suppress tile load errors (404s are normal for sparse pyramids)
      silenceMultiImageWarnings: true,
      // Limit tile retry attempts to avoid infinite 404 loops
      imageLoaderLimit: 10,
      timeout: 60_000,
    } as OpenSeadragon.Options
  })

  // Methods
  function initViewer () {
    if (!containerRef.value) {
      console.error('[DziViewer] Container element not found')
      return
    }

    try {
      // Create viewer instance
      viewer.value = OpenSeadragon(viewerOptions.value)

      // Event handlers
      viewer.value.addHandler('open', (event: OpenSeadragon.ViewerEvent) => {
        isReady.value = true
        tilesLoaded.value = 0 // Reset tile counter for new slide
        emit('open', event)
        console.log('[DziViewer] DZI metadata loaded, waiting for tiles...')
        // Start timeout to reveal viewer after max wait time
        startWaitTimeout()
        // Update ROI overlays after slide is loaded
        nextTick(() => updateROIOverlays())
      })

      viewer.value.addHandler('open-failed', (event: OpenSeadragon.ViewerEvent) => {
        console.error('[DziViewer] Failed to load slide:', event)
        emit('open-failed', event)
        // Reveal viewer anyway to show error state
        revealViewer()
      })

      viewer.value.addHandler('tile-loaded', (event: OpenSeadragon.ViewerEvent) => {
        tilesLoaded.value++
        // Check if enough tiles loaded to reveal
        checkTilesReady()
        emit('tile-loaded', event)
      })

      // Track failed tiles to prevent infinite retries
      const failedTiles = new Set<string>()

      // Tile error tracking for edge-direct re-discovery
      const { onTileError } = useEdgeFirstTileSource()
      let tileErrorCount = 0
      let tileErrorResetTimer: ReturnType<typeof setTimeout> | null = null

      // Handle tile load failures - prevent infinite retries on 404s
      viewer.value.addHandler('tile-load-failed', (event: any) => {
        // Create a unique key for this tile
        const tile = event.tile
        if (tile) {
          const tileKey = `${tile.level}-${tile.x}-${tile.y}`
          failedTiles.add(tileKey)

          // Mark tile as failed to prevent OpenSeadragon from retrying
          if (tile.loading) {
            tile.loading = false
          }
        }

        // Track rapid failures for edge-direct re-discovery
        tileErrorCount++
        if (!tileErrorResetTimer) {
          tileErrorResetTimer = setTimeout(() => {
            tileErrorCount = 0
            tileErrorResetTimer = null
          }, 10000)
        }
        if (tileErrorCount >= 3) {
          onTileError()
          tileErrorCount = 0
        }

        // Still count towards tile loading progress
        checkTilesReady()
      })

      viewer.value.addHandler('zoom', (event: OpenSeadragon.ViewerEvent) => {
        emit('zoom', event)
        if (viewer.value?.viewport) {
          emit('viewport-change', viewer.value.viewport)
        }
      })

      viewer.value.addHandler('pan', (event: OpenSeadragon.ViewerEvent) => {
        emit('pan', event)
        if (viewer.value?.viewport) {
          emit('viewport-change', viewer.value.viewport)
        }
      })

      viewer.value.addHandler('rotate', (event: OpenSeadragon.ViewerEvent) => {
        emit('rotate', event)
      })

      viewer.value.addHandler('animation-start', (event: OpenSeadragon.ViewerEvent) => {
        emit('animation-start', event)
        // Hide overlays during animation for smoother experience
        hideOverlaysDuringAnimation()
      })

      viewer.value.addHandler('animation-finish', (event: OpenSeadragon.ViewerEvent) => {
        emit('animation-finish', event)
        if (viewer.value?.viewport) {
          emit('update-viewport', viewer.value.viewport)
        }
        // Show and update overlays after animation finishes
        showOverlaysAfterAnimation()
      })

      viewer.value.addHandler('canvas-click', (event: OpenSeadragon.ViewerEvent) => {
        emit('canvas-click', event)
      })

      viewer.value.addHandler('canvas-drag', (event: OpenSeadragon.ViewerEvent) => {
        emit('canvas-drag', event)
      })

      viewer.value.addHandler('full-screen', () => {
        emit('full-screen', viewer.value?.isFullPage() ?? false)
      })

      // Setup drawing handlers
      setupDrawingHandlers()

      // Emit viewer-ready event
      emit('viewer-ready', viewer.value)

      console.log('[DziViewer] Viewer initialized')
    } catch (error) {
      console.error('[DziViewer] Initialization error:', error)
    }
  }

  function destroyViewer () {
    // Clear wait timeout
    if (waitTimeoutId.value) {
      clearTimeout(waitTimeoutId.value)
      waitTimeoutId.value = null
    }

    if (viewer.value) {
      try {
        // Cleanup drawing handlers
        cleanupDrawingHandlers()
        clearDrawingPreview()
        // Clear all ROI overlays first
        clearROIOverlays()
        // Clear all measurement overlays
        clearPersistentMeasurementOverlays()
        viewer.value.destroy()
        viewer.value = null
        isReady.value = false
        isFullyReady.value = false
        tilesLoaded.value = 0
        thumbnailLoaded.value = false
        thumbnailFailed.value = false
        console.log('[DziViewer] Viewer destroyed')
      } catch (error) {
        console.error('[DziViewer] Destroy error:', error)
      }
    }
  }

  // ROI Overlay Management
  function createROIOverlay (roi: ROI): HTMLElement {
    const el = document.createElement('div')
    el.className = 'roi-overlay'
    el.dataset.roiId = String(roi.id)
    el.dataset.roiType = roi.type

    if (roi.type === 'arrow') {
      // Arrow marker - simple arrow icon pointing to the location
      el.style.cssText = `
        cursor: pointer;
        transition: all 0.2s ease;
        pointer-events: auto !important;
        position: relative;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
      `

      // Create SVG arrow
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('width', '40')
      svg.setAttribute('height', '40')
      svg.setAttribute('viewBox', '0 0 40 40')
      svg.style.cssText = `
        filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.4));
        transition: transform 0.2s ease;
      `

      // Arrow path pointing down-left (to indicate the spot below)
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', 'M8 8 L32 32 M32 32 L32 18 M32 32 L18 32')
      path.setAttribute('stroke', roi.color)
      path.setAttribute('stroke-width', '4')
      path.setAttribute('stroke-linecap', 'round')
      path.setAttribute('stroke-linejoin', 'round')
      path.setAttribute('fill', 'none')
      svg.append(path)

      // Add white outline for visibility
      const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      outline.setAttribute('d', 'M8 8 L32 32 M32 32 L32 18 M32 32 L18 32')
      outline.setAttribute('stroke', 'white')
      outline.setAttribute('stroke-width', '6')
      outline.setAttribute('stroke-linecap', 'round')
      outline.setAttribute('stroke-linejoin', 'round')
      outline.setAttribute('fill', 'none')
      path.before(outline)

      el.append(svg)

      // Add name label
      const label = document.createElement('div')
      label.className = 'roi-label'
      label.textContent = roi.name
      label.style.cssText = `
        position: absolute;
        top: -24px;
        left: 50%;
        transform: translateX(-50%) translateY(4px);
        background: ${roi.color};
        color: white;
        padding: 3px 8px;
        font-size: 10px;
        font-weight: 600;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: all 0.2s ease;
      `
      el.append(label)

      // Hover effects for arrow
      el.addEventListener('mouseenter', () => {
        svg.style.transform = 'scale(1.2)'
        label.style.opacity = '1'
        label.style.transform = 'translateX(-50%) translateY(0)'
      })

      el.addEventListener('mouseleave', () => {
        if (!roi.isSelected) {
          svg.style.transform = 'scale(1)'
        }
        label.style.opacity = '0'
        label.style.transform = 'translateX(-50%) translateY(4px)'
      })
    } else {
      // Rectangle overlay - transparent background, only border
      el.style.cssText = `
        border: 3px solid ${roi.color};
        background: transparent;
        cursor: pointer;
        transition: all 0.2s ease;
        box-sizing: border-box;
        pointer-events: auto !important;
        position: relative;
        z-index: 100;
      `

      // Add name label
      const label = document.createElement('div')
      label.className = 'roi-label'
      label.textContent = roi.name
      label.style.cssText = `
        position: absolute;
        top: -28px;
        left: 0;
        background: ${roi.color};
        color: white;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 600;
        border-radius: 4px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transform: translateY(4px);
        transition: all 0.2s ease;
      `
      el.append(label)

      // Hover effects for rectangle
      el.addEventListener('mouseenter', () => {
        if (!isDraggingROI.value) {
          el.style.borderWidth = '4px'
          el.style.boxShadow = `0 0 15px ${roi.color}80`
          label.style.opacity = '1'
          label.style.transform = 'translateY(0)'
        }
      })

      el.addEventListener('mouseleave', () => {
        if (!isDraggingROI.value && !roi.isSelected) {
          el.style.borderWidth = '3px'
          el.style.boxShadow = 'none'
        }
        if (!isDraggingROI.value) {
          label.style.opacity = '0'
          label.style.transform = 'translateY(4px)'
        }
      })
    }

    // Controls container - position depends on ROI type
    const controlsContainer = document.createElement('div')
    controlsContainer.className = 'roi-controls'

    if (roi.type === 'arrow') {
      // For arrows: position below and to the left of the icon
      controlsContainer.style.cssText = `
        position: absolute;
        top: 100%;
        right: 50%;
        margin-top: 8px;
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 10;
        pointer-events: auto;
      `
    } else {
      // For rectangles: position at bottom right corner
      controlsContainer.style.cssText = `
        position: absolute;
        bottom: -14px;
        right: -14px;
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 10;
        pointer-events: auto;
      `
    }

    // Move handle button with professional grip icon
    const moveBtn = document.createElement('button')
    moveBtn.className = 'roi-move-btn'
    moveBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="4" cy="3" r="1.5" fill="currentColor"/>
        <circle cx="10" cy="3" r="1.5" fill="currentColor"/>
        <circle cx="4" cy="7" r="1.5" fill="currentColor"/>
        <circle cx="10" cy="7" r="1.5" fill="currentColor"/>
        <circle cx="4" cy="11" r="1.5" fill="currentColor"/>
        <circle cx="10" cy="11" r="1.5" fill="currentColor"/>
      </svg>
    `
    moveBtn.title = 'Arrastar para mover'
    moveBtn.style.cssText = `
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: none;
      background: rgba(255,255,255,0.95);
      color: #546e7a;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      transition: all 0.15s ease;
    `

    // Delete button with professional trash icon
    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'roi-delete-btn'
    deleteBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 1V2H2V3H12V2H8.5V1H5.5Z" fill="currentColor"/>
        <path d="M3 4V12C3 12.55 3.45 13 4 13H10C10.55 13 11 12.55 11 12V4H3ZM5 11H4V6H5V11ZM7.5 11H6.5V6H7.5V11ZM10 11H9V6H10V11Z" fill="currentColor"/>
      </svg>
    `
    deleteBtn.title = 'Remover anotação'
    deleteBtn.style.cssText = `
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: none;
      background: rgba(255,255,255,0.95);
      color: #546e7a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      transition: all 0.15s ease;
    `

    // Hover effects - professional subtle interactions
    moveBtn.addEventListener('mouseenter', () => {
      moveBtn.style.background = '#e3f2fd'
      moveBtn.style.color = '#1976d2'
      moveBtn.style.transform = 'scale(1.08)'
    })
    moveBtn.addEventListener('mouseleave', () => {
      moveBtn.style.background = 'rgba(255,255,255,0.95)'
      moveBtn.style.color = '#546e7a'
      moveBtn.style.transform = 'scale(1)'
      moveBtn.style.cursor = 'grab'
    })
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.background = '#ffebee'
      deleteBtn.style.color = '#c62828'
      deleteBtn.style.transform = 'scale(1.08)'
    })
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.background = 'rgba(255,255,255,0.95)'
      deleteBtn.style.color = '#546e7a'
      deleteBtn.style.transform = 'scale(1)'
    })

    controlsContainer.append(moveBtn, deleteBtn)
    el.append(controlsContainer)

    // Show controls on hover (desktop only - mobile uses panel buttons)
    el.addEventListener('mouseenter', () => {
      controlsContainer.style.opacity = '1'
    })
    el.addEventListener('mouseleave', () => {
      if (!isDraggingROI.value) {
        controlsContainer.style.opacity = '0'
      }
    })

    // Track drag state
    let dragStartScreen: { x: number, y: number } | null = null
    let placeholderInitialPos: { left: number, top: number } | null = null
    let placeholder: HTMLElement | null = null
    let lastDelta = { dx: 0, dy: 0 }

    // Delete button - use MouseTracker for reliable events
    new OpenSeadragon.MouseTracker({
      element: deleteBtn,
      clickHandler: (event: any) => {
        event.preventDefaultAction = true
        emit('roi-delete', roi.id)
      },
    })

    // Move button - use MouseTracker for drag
    new OpenSeadragon.MouseTracker({
      element: moveBtn,
      pressHandler: (event: any) => {
        event.preventDefaultAction = true

        // Store screen position from original event
        const originalEvent = event.originalEvent as MouseEvent
        dragStartScreen = { x: originalEvent.clientX, y: originalEvent.clientY }
        lastDelta = { dx: 0, dy: 0 }

        isDraggingROI.value = true
        draggedROIId.value = roi.id
        draggedROIType.value = roi.type

        // Get CURRENT coordinates from props (not stale closure)
        const currentROI = props.rois.find(r => r.id === roi.id)
        if (!currentROI) return

        // Store viewport position for final calculation
        const tiledImage = viewer.value?.world.getItemAt(0)
        if (tiledImage) {
          if (currentROI.type === 'arrow') {
            dragStartViewportPoint.value = tiledImage.imageToViewportCoordinates(
              new OpenSeadragon.Point(currentROI.coordinates.x, currentROI.coordinates.y),
            )
          } else {
            dragStartViewportRect.value = tiledImage.imageToViewportRectangle(
              currentROI.coordinates.x, currentROI.coordinates.y,
              currentROI.coordinates.width, currentROI.coordinates.height,
            )
          }
        }

        // Create placeholder (lightweight ghost)
        const rect = el.getBoundingClientRect()
        placeholderInitialPos = { left: rect.left, top: rect.top }

        placeholder = document.createElement('div')
        placeholder.style.cssText = `
          position: fixed;
          left: ${rect.left}px;
          top: ${rect.top}px;
          width: ${el.offsetWidth}px;
          height: ${el.offsetHeight}px;
          border: 3px dashed ${roi.color};
          background: ${roi.color}30;
          border-radius: 4px;
          pointer-events: none;
          z-index: 9999;
          opacity: 0.8;
        `
        document.body.append(placeholder)

        // Dim original
        el.style.opacity = '0.3'
        moveBtn.style.cursor = 'grabbing'
      },
      dragHandler: (event: any) => {
        if (!dragStartScreen || !placeholder || !placeholderInitialPos) return
        event.preventDefaultAction = true

        // Use original mouse event for accurate screen coordinates
        const originalEvent = event.originalEvent as MouseEvent
        const dx = originalEvent.clientX - dragStartScreen.x
        const dy = originalEvent.clientY - dragStartScreen.y
        lastDelta = { dx, dy }

        // Move placeholder using transform (fastest)
        placeholder.style.transform = `translate(${dx}px, ${dy}px)`
      },
      releaseHandler: (event: any) => {
        // Remove placeholder
        if (placeholder) {
          placeholder.remove()
          placeholder = null
        }

        // Restore original
        el.style.opacity = '1'
        moveBtn.style.cursor = 'grab'

        if (!dragStartScreen || !viewer.value) {
          dragStartScreen = null
          placeholderInitialPos = null
          isDraggingROI.value = false
          return
        }
        event.preventDefaultAction = true

        const { dx, dy } = lastDelta

        // Only emit if moved significantly
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          const viewportWidth = viewer.value.viewport.getContainerSize().x
          const viewportHeight = viewer.value.viewport.getContainerSize().y
          const bounds = viewer.value.viewport.getBounds()
          const viewportDx = (dx / viewportWidth) * bounds.width
          const viewportDy = (dy / viewportHeight) * bounds.height

          const tiledImage = viewer.value.world.getItemAt(0)
          if (tiledImage) {
            if (roi.type === 'arrow' && dragStartViewportPoint.value) {
              const newPoint = new OpenSeadragon.Point(
                dragStartViewportPoint.value.x + viewportDx,
                dragStartViewportPoint.value.y + viewportDy,
              )
              const imagePoint = tiledImage.viewportToImageCoordinates(newPoint)
              emit('roi-move', roi.id, {
                x: Math.round(imagePoint.x),
                y: Math.round(imagePoint.y),
                width: 50,
                height: 50,
              })
            } else if (dragStartViewportRect.value) {
              const newRect = new OpenSeadragon.Rect(
                dragStartViewportRect.value.x + viewportDx,
                dragStartViewportRect.value.y + viewportDy,
                dragStartViewportRect.value.width,
                dragStartViewportRect.value.height,
              )
              const imageRect = tiledImage.viewportToImageRectangle(newRect)
              emit('roi-move', roi.id, {
                x: Math.round(imageRect.x),
                y: Math.round(imageRect.y),
                width: Math.round(imageRect.width),
                height: Math.round(imageRect.height),
              })
            }
          }
        }

        // Reset state
        dragStartScreen = null
        placeholderInitialPos = null
        isDraggingROI.value = false
        draggedROIId.value = null
        draggedROIType.value = null
        dragStartViewportPoint.value = null
        dragStartViewportRect.value = null
      },
    })

    // Click on ROI overlay - use MouseTracker
    new OpenSeadragon.MouseTracker({
      element: el,
      clickHandler: (event: any) => {
        // Check if click was on a control button
        const target = event.originalEvent?.target as HTMLElement
        if (target?.classList?.contains('roi-delete-btn')
          || target?.classList?.contains('roi-move-btn')
          || target?.closest('.roi-controls')) {
          return
        }
        event.preventDefaultAction = true
        console.log('[DziViewer] ROI clicked')
        emit('roi-click', roi.id)
      },
    })

    return el
  }

  // Handle ROI dragging (legacy - kept for compatibility)
  function handleROIDrag (e: MouseEvent) {
    if (!isDraggingROI.value || !dragStartPoint.value || !viewer.value) return
    // Need either rect (for rectangles) or point (for arrows)
    if (!dragStartViewportRect.value && !dragStartViewportPoint.value) return

    const dx = e.clientX - dragStartPoint.value.x
    const dy = e.clientY - dragStartPoint.value.y

    // Mark as dragged if moved more than 5 pixels
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      const el = roiOverlays.value.get(draggedROIId.value!)
      if (el) {
        el.dataset.hasDragged = 'true'
      }
    }

    // Convert pixel delta to viewport delta
    const containerRect = containerRef.value?.getBoundingClientRect()
    if (!containerRect) return

    const viewportWidth = viewer.value.viewport.getContainerSize().x
    const viewportHeight = viewer.value.viewport.getContainerSize().y
    const bounds = viewer.value.viewport.getBounds()

    const viewportDx = (dx / viewportWidth) * bounds.width
    const viewportDy = (dy / viewportHeight) * bounds.height

    const el = roiOverlays.value.get(draggedROIId.value!)
    if (!el) return

    try {
      viewer.value.removeOverlay(el)
    } catch { /* ignore */ }

    if (draggedROIType.value === 'arrow' && dragStartViewportPoint.value) {
      // Arrow uses point
      const newPoint = new OpenSeadragon.Point(
        dragStartViewportPoint.value.x + viewportDx,
        dragStartViewportPoint.value.y + viewportDy,
      )
      viewer.value.addOverlay({
        element: el,
        location: newPoint,
        placement: OpenSeadragon.Placement.BOTTOM_RIGHT,
      })
    } else if (dragStartViewportRect.value) {
      // Rectangle uses rect
      const newRect = new OpenSeadragon.Rect(
        dragStartViewportRect.value.x + viewportDx,
        dragStartViewportRect.value.y + viewportDy,
        dragStartViewportRect.value.width,
        dragStartViewportRect.value.height,
      )
      viewer.value.addOverlay({
        element: el,
        location: newRect,
      })
    }
  }

  // Handle ROI drag end
  function handleROIDragEnd (e: MouseEvent) {
    document.removeEventListener('mousemove', handleROIDrag)
    document.removeEventListener('mouseup', handleROIDragEnd)

    if (!isDraggingROI.value || !draggedROIId.value) return

    const el = roiOverlays.value.get(draggedROIId.value)
    const hasDragged = el?.dataset.hasDragged === 'true'

    // Re-enable OSD mouse nav
    viewer.value?.setMouseNavEnabled(true)

    if (el) {
      el.style.cursor = 'pointer'
      el.style.transition = 'all 0.2s ease'
      delete el.dataset.hasDragged
    }

    // If dragged, emit new coordinates
    if (hasDragged && viewer.value && dragStartPoint.value) {
      const dx = e.clientX - dragStartPoint.value.x
      const dy = e.clientY - dragStartPoint.value.y

      // Convert to viewport coordinates
      const viewportWidth = viewer.value.viewport.getContainerSize().x
      const viewportHeight = viewer.value.viewport.getContainerSize().y
      const bounds = viewer.value.viewport.getBounds()

      const viewportDx = (dx / viewportWidth) * bounds.width
      const viewportDy = (dy / viewportHeight) * bounds.height

      const tiledImage = viewer.value.world.getItemAt(0)
      if (tiledImage) {
        if (draggedROIType.value === 'arrow' && dragStartViewportPoint.value) {
          // Arrow - emit point coordinates
          const newViewportPoint = new OpenSeadragon.Point(
            dragStartViewportPoint.value.x + viewportDx,
            dragStartViewportPoint.value.y + viewportDy,
          )
          const imagePoint = tiledImage.viewportToImageCoordinates(newViewportPoint)
          emit('roi-move', draggedROIId.value, {
            x: Math.round(imagePoint.x),
            y: Math.round(imagePoint.y),
            width: 50, // Fixed size for arrow
            height: 50,
          })
        } else if (dragStartViewportRect.value) {
          // Rectangle - emit rect coordinates
          const newViewportRect = new OpenSeadragon.Rect(
            dragStartViewportRect.value.x + viewportDx,
            dragStartViewportRect.value.y + viewportDy,
            dragStartViewportRect.value.width,
            dragStartViewportRect.value.height,
          )
          const imageRect = tiledImage.viewportToImageRectangle(newViewportRect)
          emit('roi-move', draggedROIId.value, {
            x: Math.round(imageRect.x),
            y: Math.round(imageRect.y),
            width: Math.round(imageRect.width),
            height: Math.round(imageRect.height),
          })
        }
      }
    } else if (!hasDragged) {
      // It was a click, not a drag
      console.log('[DziViewer] ROI clicked (no drag):', draggedROIId.value)
      emit('roi-click', draggedROIId.value!)
    }

    // Reset drag state
    isDraggingROI.value = false
    draggedROIId.value = null
    draggedROIType.value = null
    dragStartPoint.value = null
    dragStartViewportRect.value = null
    dragStartViewportPoint.value = null
  }

  function updateROIOverlays () {
    if (!viewer.value || !isReady.value) return

    const tiledImage = viewer.value.world.getItemAt(0)
    if (!tiledImage) return

    // Remove old overlays that are no longer in the list
    const currentIds = new Set(props.rois.map(r => r.id))
    for (const [id, el] of roiOverlays.value.entries()) {
      if (!currentIds.has(id)) {
        viewer.value?.removeOverlay(el)
        roiOverlays.value.delete(id)
      }
    }

    // Add or update overlays
    for (const roi of props.rois) {
      let el = roiOverlays.value.get(roi.id)

      // Create new overlay if it doesn't exist
      if (!el) {
        el = createROIOverlay(roi)
        roiOverlays.value.set(roi.id, el)
      }

      // Update label text (in case name changed)
      const label = el.querySelector('.roi-label') as HTMLElement | null
      if (label && label.textContent !== roi.name) {
        label.textContent = roi.name
      }

      // Update selected state (only for rectangles)
      const isSelected = roi.id === props.selectedROIId
      if (roi.type === 'rectangle') {
        if (isSelected) {
          el.style.borderWidth = '4px'
          el.style.boxShadow = `0 0 15px ${roi.color}80`
          el.classList.add('roi-selected')
        } else {
          el.style.borderWidth = '3px'
          el.style.boxShadow = 'none'
          el.classList.remove('roi-selected')
        }
      } else if (roi.type === 'arrow') {
        // Arrow selection just scales the SVG
        const svg = el.querySelector('svg')
        if (svg) {
          svg.style.transform = isSelected ? 'scale(1.3)' : 'scale(1)'
        }
        el.classList.toggle('roi-selected', isSelected)
      }

      // Add or update overlay position
      try {
        viewer.value?.removeOverlay(el)
      } catch { /* ignore if not found */ }

      if (roi.type === 'arrow') {
        // Arrow uses a point location (positioned at the arrow tip)
        const viewportPoint = tiledImage.imageToViewportCoordinates(
          new OpenSeadragon.Point(roi.coordinates.x, roi.coordinates.y),
        )
        viewer.value?.addOverlay({
          element: el,
          location: viewportPoint,
          placement: OpenSeadragon.Placement.BOTTOM_RIGHT, // Arrow points to this location
          checkResize: false,
        })
      } else {
        // Rectangle uses a rect location
        const viewportRect = tiledImage.imageToViewportRectangle(
          roi.coordinates.x,
          roi.coordinates.y,
          roi.coordinates.width,
          roi.coordinates.height,
        )
        viewer.value?.addOverlay({
          element: el,
          location: viewportRect,
          checkResize: false,
        })
      }
    }
  }

  function clearROIOverlays () {
    for (const [, el] of roiOverlays.value) {
      try {
        viewer.value?.removeOverlay(el)
      } catch { /* ignore */ }
    }
    roiOverlays.value.clear()
  }

  // Drawing Functions
  function createDrawingPreview () {
    if (drawingPreviewElement.value) return

    const el = document.createElement('div')
    el.className = 'drawing-preview'
    el.style.cssText = `
      border: 3px dashed #4A90A4;
      background: rgba(74, 144, 164, 0.15);
      pointer-events: none;
      box-sizing: border-box;
    `
    drawingPreviewElement.value = el
  }

  function updateRectanglePreview (startPoint: { x: number, y: number }, currentPoint: { x: number, y: number }) {
    if (!viewer.value || !drawingPreviewElement.value) return

    const tiledImage = viewer.value.world.getItemAt(0)
    if (!tiledImage) return

    // Calculate rectangle in image coordinates
    const x = Math.min(startPoint.x, currentPoint.x)
    const y = Math.min(startPoint.y, currentPoint.y)
    const width = Math.abs(currentPoint.x - startPoint.x)
    const height = Math.abs(currentPoint.y - startPoint.y)

    if (width < 5 || height < 5) return // Minimum size

    // Convert to viewport coordinates
    const viewportRect = tiledImage.imageToViewportRectangle(x, y, width, height)

    // Update overlay
    try {
      viewer.value.removeOverlay(drawingPreviewElement.value)
    } catch { /* ignore */ }

    viewer.value.addOverlay({
      element: drawingPreviewElement.value,
      location: viewportRect,
    })
  }

  function clearDrawingPreview () {
    if (drawingPreviewElement.value) {
      try {
        viewer.value?.removeOverlay(drawingPreviewElement.value)
      } catch { /* ignore */ }
      drawingPreviewElement.value = null
    }
  }

  function finishRectangleDrawing (endPoint: { x: number, y: number }) {
    if (!drawingStartPoint.value) return

    const x = Math.min(drawingStartPoint.value.x, endPoint.x)
    const y = Math.min(drawingStartPoint.value.y, endPoint.y)
    const width = Math.abs(endPoint.x - drawingStartPoint.value.x)
    const height = Math.abs(endPoint.y - drawingStartPoint.value.y)

    // Minimum size check
    if (width < 20 || height < 20) {
      cancelDrawing()
      return
    }

    const coordinates: ROICoordinates = { x, y, width, height }
    emit('drawing-complete', coordinates, 'rectangle')

    resetDrawingState()
  }

  function cancelDrawing () {
    emit('drawing-cancel')
    resetDrawingState()
  }

  function resetDrawingState () {
    isDrawing.value = false
    drawingStartPoint.value = null
    clearDrawingPreview()
    viewer.value?.setMouseNavEnabled(true)
  }

  // Measurement functions
  function createMeasurementOverlay () {
    if (!viewer.value) return

    // Remove existing measurement overlay if any
    removeMeasurementOverlay()

    // Disable mouse navigation during measurement
    viewer.value.setMouseNavEnabled(false)

    // Create SVG element for the measurement line
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'measurement-overlay')
    svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    `

    // Create line element
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('id', 'measurement-line')
    line.setAttribute('stroke', '#FFD700')
    line.setAttribute('stroke-width', '3')
    line.setAttribute('stroke-dasharray', '8,4')

    // Create start circle
    const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    startCircle.setAttribute('id', 'measurement-start')
    startCircle.setAttribute('r', '6')
    startCircle.setAttribute('fill', '#FFD700')
    startCircle.setAttribute('stroke', '#fff')
    startCircle.setAttribute('stroke-width', '2')

    // Create end circle
    const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    endCircle.setAttribute('id', 'measurement-end')
    endCircle.setAttribute('r', '6')
    endCircle.setAttribute('fill', '#FFD700')
    endCircle.setAttribute('stroke', '#fff')
    endCircle.setAttribute('stroke-width', '2')

    // Create text label for distance
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('id', 'measurement-text')
    text.setAttribute('fill', '#FFD700')
    text.setAttribute('font-size', '14')
    text.setAttribute('font-weight', 'bold')
    text.setAttribute('text-anchor', 'middle')
    text.style.cssText = `
      paint-order: stroke;
      stroke: #000;
      stroke-width: 3px;
      stroke-linecap: round;
      stroke-linejoin: round;
    `

    svg.append(line)
    svg.append(startCircle)
    svg.append(endCircle)
    svg.append(text)

    const canvas = viewer.value.canvas as HTMLElement
    canvas.append(svg)
    measurementOverlay.value = svg

    updateMeasurementOverlay()
  }

  function updateMeasurementOverlay () {
    if (!viewer.value || !measurementOverlay.value || !drawingStartPoint.value || !measurementEndPoint.value) return

    const tiledImage = viewer.value.world.getItemAt(0)
    if (!tiledImage) return

    // Convert image coordinates to pixel coordinates
    const startViewport = tiledImage.imageToViewportCoordinates(drawingStartPoint.value.x, drawingStartPoint.value.y)
    const endViewport = tiledImage.imageToViewportCoordinates(measurementEndPoint.value.x, measurementEndPoint.value.y)

    const startPixel = viewer.value.viewport.pixelFromPoint(startViewport)
    const endPixel = viewer.value.viewport.pixelFromPoint(endViewport)

    // Update SVG elements
    const line = measurementOverlay.value.querySelector('#measurement-line')
    const startCircle = measurementOverlay.value.querySelector('#measurement-start')
    const endCircle = measurementOverlay.value.querySelector('#measurement-end')
    const text = measurementOverlay.value.querySelector('#measurement-text')

    if (line) {
      line.setAttribute('x1', String(startPixel.x))
      line.setAttribute('y1', String(startPixel.y))
      line.setAttribute('x2', String(endPixel.x))
      line.setAttribute('y2', String(endPixel.y))
    }

    if (startCircle) {
      startCircle.setAttribute('cx', String(startPixel.x))
      startCircle.setAttribute('cy', String(startPixel.y))
    }

    if (endCircle) {
      endCircle.setAttribute('cx', String(endPixel.x))
      endCircle.setAttribute('cy', String(endPixel.y))
    }

    // Calculate distance
    const distancePixels = Math.sqrt(
      Math.pow(measurementEndPoint.value.x - drawingStartPoint.value.x, 2)
      + Math.pow(measurementEndPoint.value.y - drawingStartPoint.value.y, 2),
    )

    // Convert to microns (assuming 0.25 microns per pixel - typical for 40x scans)
    // This value should be configurable based on actual slide MPP
    const micronsPerPixel = 0.25
    const distanceMicrons = distancePixels * micronsPerPixel

    // Format distance
    let distanceFormatted: string
    distanceFormatted = distanceMicrons >= 1000 ? `${(distanceMicrons / 1000).toFixed(2)} mm` : `${distanceMicrons.toFixed(1)} µm`

    if (text) {
      text.textContent = distanceFormatted
      // Position text at midpoint, slightly offset
      const midX = (startPixel.x + endPixel.x) / 2
      const midY = (startPixel.y + endPixel.y) / 2 - 15
      text.setAttribute('x', String(midX))
      text.setAttribute('y', String(midY))
    }
  }

  function finishMeasurement (endPoint: { x: number, y: number }) {
    if (!drawingStartPoint.value) return

    const distancePixels = Math.sqrt(
      Math.pow(endPoint.x - drawingStartPoint.value.x, 2)
      + Math.pow(endPoint.y - drawingStartPoint.value.y, 2),
    )

    // Minimum distance threshold to avoid accidental clicks
    if (distancePixels < 10) {
      cancelMeasurement()
      return
    }

    const micronsPerPixel = 0.25
    const distanceMicrons = distancePixels * micronsPerPixel

    let distanceFormatted: string
    distanceFormatted = distanceMicrons >= 1000 ? `${(distanceMicrons / 1000).toFixed(2)} mm` : `${distanceMicrons.toFixed(1)} µm`

    const result: Omit<MeasurementResult, 'id'> = {
      startPoint: { ...drawingStartPoint.value },
      endPoint: { ...endPoint },
      distancePixels,
      distanceMicrons,
      distanceFormatted,
    }

    console.log('[DziViewer] Measurement complete:', result)
    emit('measurement-complete', result)

    // Remove temporary overlay - it will be rendered as persistent overlay
    removeMeasurementOverlay()

    // Reset drawing state but keep mouse nav disabled for continuous measuring
    isDrawing.value = false
    drawingStartPoint.value = null
    measurementEndPoint.value = null
    // Don't re-enable mouse nav - keep it disabled for continuous measurements
    // Mouse nav will be re-enabled when switching away from measure mode
  }

  function cancelMeasurement () {
    removeMeasurementOverlay()
    isDrawing.value = false
    drawingStartPoint.value = null
    measurementEndPoint.value = null
    // Don't re-enable mouse nav here - it will be re-enabled when mode changes
  }

  function removeMeasurementOverlay () {
    if (measurementOverlay.value) {
      measurementOverlay.value.remove()
      measurementOverlay.value = null
    }
  }

  // Persistent measurement overlay functions
  function createPersistentMeasurementOverlay (measurement: MeasurementResult): HTMLElement {
    const container = document.createElement('div')
    container.className = 'persistent-measurement-overlay'
    container.dataset.measurementId = String(measurement.id)
    container.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 100;
    `

    // Create SVG for the measurement line
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'measurement-svg')
    svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
      pointer-events: none;
    `

    // Line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('class', 'measurement-line')
    line.setAttribute('stroke', '#FFD700')
    line.setAttribute('stroke-width', '3')

    // Start circle
    const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    startCircle.setAttribute('class', 'measurement-start')
    startCircle.setAttribute('r', '6')
    startCircle.setAttribute('fill', '#FFD700')
    startCircle.setAttribute('stroke', '#fff')
    startCircle.setAttribute('stroke-width', '2')

    // End circle
    const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    endCircle.setAttribute('class', 'measurement-end')
    endCircle.setAttribute('r', '6')
    endCircle.setAttribute('fill', '#FFD700')
    endCircle.setAttribute('stroke', '#fff')
    endCircle.setAttribute('stroke-width', '2')

    // Text label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('class', 'measurement-text')
    text.setAttribute('fill', '#FFD700')
    text.setAttribute('font-size', '13')
    text.setAttribute('font-weight', 'bold')
    text.setAttribute('text-anchor', 'middle')
    text.textContent = measurement.distanceFormatted
    text.style.cssText = `
      paint-order: stroke;
      stroke: #000;
      stroke-width: 3px;
      stroke-linecap: round;
      stroke-linejoin: round;
    `

    svg.append(line)
    svg.append(startCircle)
    svg.append(endCircle)
    svg.append(text)
    container.append(svg)

    // Controls container (delete button)
    const controlsContainer = document.createElement('div')
    controlsContainer.className = 'measurement-controls'
    controlsContainer.style.cssText = `
      position: absolute;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 10;
      pointer-events: auto;
    `

    // Delete button
    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'measurement-delete-btn'
    deleteBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 1V2H2V3H12V2H8.5V1H5.5Z" fill="currentColor"/>
        <path d="M3 4V12C3 12.55 3.45 13 4 13H10C10.55 13 11 12.55 11 12V4H3ZM5 11H4V6H5V11ZM7.5 11H6.5V6H7.5V11ZM10 11H9V6H10V11Z" fill="currentColor"/>
      </svg>
    `
    deleteBtn.title = 'Remover medição'
    deleteBtn.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: none;
      background: rgba(255,255,255,0.95);
      color: #546e7a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      transition: all 0.15s ease;
    `

    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.background = '#ffebee'
      deleteBtn.style.color = '#c62828'
      deleteBtn.style.transform = 'scale(1.08)'
    })
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.background = 'rgba(255,255,255,0.95)'
      deleteBtn.style.color = '#546e7a'
      deleteBtn.style.transform = 'scale(1)'
    })

    // Delete button click handler
    new OpenSeadragon.MouseTracker({
      element: deleteBtn,
      clickHandler: (event: any) => {
        event.preventDefaultAction = true
        emit('measurement-delete', measurement.id)
      },
    })

    controlsContainer.append(deleteBtn)
    container.append(controlsContainer)

    // Show controls on hover (desktop)
    container.addEventListener('mouseenter', () => {
      controlsContainer.style.opacity = '1'
    })
    container.addEventListener('mouseleave', () => {
      controlsContainer.style.opacity = '0'
    })

    // Show controls on touch (mobile) - for measurements keep touch since no panel
    container.addEventListener('touchstart', () => {
      controlsContainer.style.opacity = '1'
    }, { passive: true })
    container.addEventListener('touchend', () => {
      // Keep visible for a moment to allow tapping the delete button
      setTimeout(() => {
        controlsContainer.style.opacity = '0'
      }, 3000)
    }, { passive: true })

    // Make container receive pointer events for hover
    container.style.pointerEvents = 'auto'

    return container
  }

  function updatePersistentMeasurementOverlay (measurement: MeasurementResult, el: HTMLElement) {
    if (!viewer.value) return

    const tiledImage = viewer.value.world.getItemAt(0)
    if (!tiledImage) return

    // Convert image coordinates to pixel coordinates
    const startViewport = tiledImage.imageToViewportCoordinates(measurement.startPoint.x, measurement.startPoint.y)
    const endViewport = tiledImage.imageToViewportCoordinates(measurement.endPoint.x, measurement.endPoint.y)

    const startPixel = viewer.value.viewport.pixelFromPoint(startViewport)
    const endPixel = viewer.value.viewport.pixelFromPoint(endViewport)

    // Calculate bounding box
    const minX = Math.min(startPixel.x, endPixel.x) - 50
    const minY = Math.min(startPixel.y, endPixel.y) - 50
    const width = Math.abs(endPixel.x - startPixel.x) + 100
    const height = Math.abs(endPixel.y - startPixel.y) + 100

    // Position container
    el.style.left = `${minX}px`
    el.style.top = `${minY}px`
    el.style.width = `${width}px`
    el.style.height = `${height}px`

    // Local coordinates within container
    const localStartX = startPixel.x - minX
    const localStartY = startPixel.y - minY
    const localEndX = endPixel.x - minX
    const localEndY = endPixel.y - minY

    // Update SVG elements
    const line = el.querySelector('.measurement-line')
    const startCircle = el.querySelector('.measurement-start')
    const endCircle = el.querySelector('.measurement-end')
    const text = el.querySelector('.measurement-text')
    const controls = el.querySelector('.measurement-controls') as HTMLElement

    if (line) {
      line.setAttribute('x1', String(localStartX))
      line.setAttribute('y1', String(localStartY))
      line.setAttribute('x2', String(localEndX))
      line.setAttribute('y2', String(localEndY))
    }

    if (startCircle) {
      startCircle.setAttribute('cx', String(localStartX))
      startCircle.setAttribute('cy', String(localStartY))
    }

    if (endCircle) {
      endCircle.setAttribute('cx', String(localEndX))
      endCircle.setAttribute('cy', String(localEndY))
    }

    if (text) {
      // Position text at midpoint
      const midX = (localStartX + localEndX) / 2
      const midY = (localStartY + localEndY) / 2 - 15
      text.setAttribute('x', String(midX))
      text.setAttribute('y', String(midY))
    }

    // Position controls near the midpoint
    if (controls) {
      const midX = (localStartX + localEndX) / 2
      const midY = (localStartY + localEndY) / 2
      controls.style.left = `${midX + 15}px`
      controls.style.top = `${midY - 12}px`
    }
  }

  function updatePersistentMeasurementOverlays () {
    if (!viewer.value || !isReady.value) return

    const canvas = viewer.value.canvas as HTMLElement
    const measurements = props.measurements || []

    // Remove old overlays that are no longer in the list
    const currentIds = new Set(measurements.map(m => m.id))
    for (const [id, el] of measurementOverlays.value.entries()) {
      if (!currentIds.has(id)) {
        el.remove()
        measurementOverlays.value.delete(id)
      }
    }

    // Add or update overlays
    for (const measurement of measurements) {
      let el = measurementOverlays.value.get(measurement.id)

      if (!el) {
        el = createPersistentMeasurementOverlay(measurement)
        measurementOverlays.value.set(measurement.id, el)
        canvas.append(el)
      }

      updatePersistentMeasurementOverlay(measurement, el)
    }
  }

  function clearPersistentMeasurementOverlays () {
    for (const [, el] of measurementOverlays.value) {
      el.remove()
    }
    measurementOverlays.value.clear()
  }

  // Hide/show overlays during animations for smoother experience
  function hideOverlaysDuringAnimation () {
    isAnimating.value = true
    // Hide ROI overlays
    for (const [, el] of roiOverlays.value) {
      el.style.opacity = '0'
      el.style.transition = 'opacity 0.1s ease-out'
    }
    // Hide measurement overlays
    for (const [, el] of measurementOverlays.value) {
      el.style.opacity = '0'
      el.style.transition = 'opacity 0.1s ease-out'
    }
  }

  function showOverlaysAfterAnimation () {
    isAnimating.value = false
    // Update and show ROI overlays
    updateROIOverlays()
    for (const [, el] of roiOverlays.value) {
      el.style.opacity = '1'
    }
    // Update and show measurement overlays
    updatePersistentMeasurementOverlays()
    for (const [, el] of measurementOverlays.value) {
      el.style.opacity = '1'
    }
  }

  function setupDrawingHandlers () {
    if (!viewer.value) return
    console.log('[DziViewer] Setting up drawing handlers')

    const canvas = viewer.value.canvas as HTMLElement

    // Use native DOM events for drawing (OpenSeadragon events don't fire when mouse nav is disabled)
    canvas.addEventListener('mousedown', handleCanvasMouseDown)
    canvas.addEventListener('mousemove', handleCanvasMouseMove)
    canvas.addEventListener('mouseup', handleCanvasMouseUp)
    canvas.addEventListener('dblclick', handleCanvasDoubleClick)

    // Touch events for mobile drawing
    canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleCanvasTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleCanvasTouchEnd, { passive: false })

    // Escape key to cancel drawing
    document.addEventListener('keydown', handleKeyDown)
  }

  function getImageCoordsFromMouseEvent (event: MouseEvent): { x: number, y: number } | null {
    if (!viewer.value || !containerRef.value) return null

    const canvas = viewer.value.canvas as HTMLElement
    const rect = canvas.getBoundingClientRect()
    const pixelPoint = new OpenSeadragon.Point(event.clientX - rect.left, event.clientY - rect.top)
    const viewportPoint = viewer.value.viewport.pointFromPixel(pixelPoint)
    const tiledImage = viewer.value.world.getItemAt(0)
    if (!tiledImage) return null

    const imagePoint = tiledImage.viewportToImageCoordinates(viewportPoint)
    return { x: Math.round(imagePoint.x), y: Math.round(imagePoint.y) }
  }

  function handleCanvasMouseDown (event: MouseEvent) {
    console.log('[DziViewer] mousedown, drawingMode:', props.drawingMode)
    if (props.drawingMode === 'none' || isDraggingROI.value) return
    if (event.button !== 0) return // Only left click

    const imageCoords = getImageCoordsFromMouseEvent(event)
    console.log('[DziViewer] imageCoords:', imageCoords)
    if (!imageCoords) return

    switch (props.drawingMode) {
      case 'rectangle': {
        console.log('[DziViewer] Starting rectangle drawing')
        event.preventDefault()
        event.stopPropagation()
        isDrawing.value = true
        drawingStartPoint.value = imageCoords
        createDrawingPreview()

        break
      }
      case 'arrow': {
        // Arrow is a single click "stamp" - place arrow marker immediately
        console.log('[DziViewer] Placing arrow marker at:', imageCoords)
        event.preventDefault()
        event.stopPropagation()

        // Create coordinates for the arrow marker (small fixed size)
        const coordinates: ROICoordinates = {
          x: imageCoords.x,
          y: imageCoords.y,
          width: 50, // Fixed small size for the marker
          height: 50,
        }

        emit('drawing-complete', coordinates, 'arrow')

        break
      }
      case 'measure': {
        console.log('[DziViewer] Starting measurement at:', imageCoords)
        event.preventDefault()
        event.stopPropagation()
        isDrawing.value = true
        drawingStartPoint.value = imageCoords
        measurementEndPoint.value = imageCoords
        createMeasurementOverlay()

        break
      }
    // No default
    }
  }

  function handleCanvasMouseMove (event: MouseEvent) {
    if (props.drawingMode === 'none') return

    const imageCoords = getImageCoordsFromMouseEvent(event)
    if (!imageCoords) return

    if (props.drawingMode === 'rectangle' && isDrawing.value && drawingStartPoint.value) {
      updateRectanglePreview(drawingStartPoint.value, imageCoords)
    } else if (props.drawingMode === 'measure' && isDrawing.value && drawingStartPoint.value) {
      measurementEndPoint.value = imageCoords
      updateMeasurementOverlay()
    }
    // Arrow doesn't need mousemove - it's a single click stamp
  }

  function handleCanvasMouseUp (event: MouseEvent) {
    console.log('[DziViewer] mouseup, drawingMode:', props.drawingMode, 'isDrawing:', isDrawing.value)
    if (props.drawingMode === 'rectangle' && isDrawing.value) {
      const imageCoords = getImageCoordsFromMouseEvent(event)
      if (imageCoords) {
        finishRectangleDrawing(imageCoords)
      } else {
        cancelDrawing()
      }
    } else if (props.drawingMode === 'measure' && isDrawing.value) {
      const imageCoords = getImageCoordsFromMouseEvent(event)
      if (imageCoords && drawingStartPoint.value) {
        finishMeasurement(imageCoords)
      } else {
        cancelMeasurement()
      }
    }
    // Arrow is handled on mousedown - no mouseup action needed
  }

  function handleCanvasDoubleClick (_event: MouseEvent) {
    // Double click not used for current drawing modes
  }

  // Touch event handlers for mobile drawing
  function getImageCoordsFromTouchEvent (event: TouchEvent): { x: number, y: number } | null {
    if (!viewer.value || !containerRef.value) return null
    if (event.touches.length === 0) return null

    const touch = event.touches[0]
    if (!touch) return null
    const canvas = viewer.value.canvas as HTMLElement
    const rect = canvas.getBoundingClientRect()
    const pixelPoint = new OpenSeadragon.Point(touch.clientX - rect.left, touch.clientY - rect.top)
    const viewportPoint = viewer.value.viewport.pointFromPixel(pixelPoint)
    const tiledImage = viewer.value.world.getItemAt(0)
    if (!tiledImage) return null

    const imagePoint = tiledImage.viewportToImageCoordinates(viewportPoint)
    return { x: Math.round(imagePoint.x), y: Math.round(imagePoint.y) }
  }

  function getImageCoordsFromChangedTouches (event: TouchEvent): { x: number, y: number } | null {
    if (!viewer.value || !containerRef.value) return null
    if (event.changedTouches.length === 0) return null

    const touch = event.changedTouches[0]
    if (!touch) return null
    const canvas = viewer.value.canvas as HTMLElement
    const rect = canvas.getBoundingClientRect()
    const pixelPoint = new OpenSeadragon.Point(touch.clientX - rect.left, touch.clientY - rect.top)
    const viewportPoint = viewer.value.viewport.pointFromPixel(pixelPoint)
    const tiledImage = viewer.value.world.getItemAt(0)
    if (!tiledImage) return null

    const imagePoint = tiledImage.viewportToImageCoordinates(viewportPoint)
    return { x: Math.round(imagePoint.x), y: Math.round(imagePoint.y) }
  }

  function handleCanvasTouchStart (event: TouchEvent) {
    console.log('[DziViewer] touchstart, drawingMode:', props.drawingMode)
    if (props.drawingMode === 'none' || isDraggingROI.value) return
    if (event.touches.length !== 1) return // Only single touch

    const imageCoords = getImageCoordsFromTouchEvent(event)
    console.log('[DziViewer] touch imageCoords:', imageCoords)
    if (!imageCoords) return

    switch (props.drawingMode) {
      case 'rectangle': {
        console.log('[DziViewer] Starting rectangle drawing (touch)')
        event.preventDefault()
        event.stopPropagation()
        isDrawing.value = true
        drawingStartPoint.value = imageCoords
        createDrawingPreview()
        break
      }
      case 'arrow': {
        // Arrow is a single touch "stamp" - place arrow marker immediately
        console.log('[DziViewer] Placing arrow marker at (touch):', imageCoords)
        event.preventDefault()
        event.stopPropagation()

        const coordinates: ROICoordinates = {
          x: imageCoords.x,
          y: imageCoords.y,
          width: 50,
          height: 50,
        }

        emit('drawing-complete', coordinates, 'arrow')
        break
      }
      case 'measure': {
        console.log('[DziViewer] Starting measurement at (touch):', imageCoords)
        event.preventDefault()
        event.stopPropagation()
        isDrawing.value = true
        drawingStartPoint.value = imageCoords
        measurementEndPoint.value = imageCoords
        createMeasurementOverlay()
        break
      }
    }
  }

  function handleCanvasTouchMove (event: TouchEvent) {
    if (props.drawingMode === 'none') return
    if (event.touches.length !== 1) return

    const imageCoords = getImageCoordsFromTouchEvent(event)
    if (!imageCoords) return

    if (props.drawingMode === 'rectangle' && isDrawing.value && drawingStartPoint.value) {
      event.preventDefault()
      updateRectanglePreview(drawingStartPoint.value, imageCoords)
    } else if (props.drawingMode === 'measure' && isDrawing.value && drawingStartPoint.value) {
      event.preventDefault()
      measurementEndPoint.value = imageCoords
      updateMeasurementOverlay()
    }
  }

  function handleCanvasTouchEnd (event: TouchEvent) {
    console.log('[DziViewer] touchend, drawingMode:', props.drawingMode, 'isDrawing:', isDrawing.value)
    if (props.drawingMode === 'rectangle' && isDrawing.value) {
      const imageCoords = getImageCoordsFromChangedTouches(event)
      if (imageCoords) {
        finishRectangleDrawing(imageCoords)
      } else {
        cancelDrawing()
      }
    } else if (props.drawingMode === 'measure' && isDrawing.value) {
      const imageCoords = getImageCoordsFromChangedTouches(event)
      if (imageCoords && drawingStartPoint.value) {
        finishMeasurement(imageCoords)
      } else {
        cancelMeasurement()
      }
    }
  }

  function handleKeyDown (event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (isDrawing.value) {
        if (props.drawingMode === 'measure') {
          cancelMeasurement()
        } else {
          cancelDrawing()
        }
      } else if (measurementOverlay.value) {
        // Clear measurement overlay when pressing Escape
        removeMeasurementOverlay()
      }
    }
  }

  function cleanupDrawingHandlers () {
    document.removeEventListener('keydown', handleKeyDown)
    if (viewer.value) {
      const canvas = viewer.value.canvas as HTMLElement
      canvas.removeEventListener('mousedown', handleCanvasMouseDown)
      canvas.removeEventListener('mousemove', handleCanvasMouseMove)
      canvas.removeEventListener('mouseup', handleCanvasMouseUp)
      canvas.removeEventListener('dblclick', handleCanvasDoubleClick)
      // Remove touch event listeners
      canvas.removeEventListener('touchstart', handleCanvasTouchStart)
      canvas.removeEventListener('touchmove', handleCanvasTouchMove)
      canvas.removeEventListener('touchend', handleCanvasTouchEnd)
    }
  }

  // Public API (exposed methods)
  function zoomIn (factor = 1.2) {
    viewer.value?.viewport.zoomBy(factor)
    viewer.value?.viewport.applyConstraints()
  }

  function zoomOut (factor = 0.8) {
    viewer.value?.viewport.zoomBy(factor)
    viewer.value?.viewport.applyConstraints()
  }

  function resetZoom () {
    viewer.value?.viewport.goHome()
  }

  function setZoom (zoomLevel: number, immediately = false) {
    if (viewer.value?.viewport) {
      viewer.value.viewport.zoomTo(zoomLevel, undefined, immediately)
    }
  }

  function getZoom (): number | null {
    return viewer.value?.viewport.getZoom() ?? null
  }

  function panTo (x: number, y: number, immediately = false) {
    if (viewer.value?.viewport) {
      const point = new OpenSeadragon.Point(x, y)
      viewer.value.viewport.panTo(point, immediately)
    }
  }

  function rotateTo (degrees: number, immediately = false) {
    if (viewer.value?.viewport) {
      viewer.value.viewport.setRotation(degrees, immediately)
    }
  }

  function rotateBy (degrees: number) {
    if (viewer.value?.viewport) {
      const currentRotation = viewer.value.viewport.getRotation()
      viewer.value.viewport.setRotation(currentRotation + degrees)
    }
  }

  function getViewport (): OpenSeadragon.Viewport | null {
    return viewer.value?.viewport ?? null
  }

  function getBounds (): OpenSeadragon.Rect | null {
    return viewer.value?.viewport.getBounds() ?? null
  }

  function fitBounds (bounds: OpenSeadragon.Rect, immediately = false) {
    viewer.value?.viewport.fitBounds(bounds, immediately)
  }

  function goToPage (pageIndex: number) {
    viewer.value?.goToPage(pageIndex)
  }

  function addOverlay (element: Element | string,
                       location: OpenSeadragon.Point | OpenSeadragon.Rect,
                       placement?: OpenSeadragon.Placement) {
                         viewer.value?.addOverlay(element, location, placement)
                       }

  function removeOverlay (element: Element | string) {
    viewer.value?.removeOverlay(element)
  }

  function clearOverlays () {
    viewer.value?.clearOverlays()
  }

  function forceRedraw () {
    viewer.value?.forceRedraw()
  }

  function setMouseNavEnabled (enabled: boolean) {
    if (viewer.value) {
      viewer.value.setMouseNavEnabled(enabled)
    }
  }

  function getTileSource (): OpenSeadragon.TileSource | null {
    return viewer.value?.world.getItemAt(0)?.source ?? null
  }

  // Watch for tile source changes
  watch(
    () => props.tileSource,
    newSource => {
      if (viewer.value && newSource) {
        // Reset loading states for new slide
        isFullyReady.value = false
        tilesLoaded.value = 0
        thumbnailLoaded.value = false
        thumbnailFailed.value = false
        // Clear any existing timeout
        if (waitTimeoutId.value) {
          clearTimeout(waitTimeoutId.value)
          waitTimeoutId.value = null
        }
        viewer.value.open(newSource)
      }
    },
  )

  // Watch for ROI changes
  watch(
    () => props.rois,
    () => {
      nextTick(() => updateROIOverlays())
    },
    { deep: true },
  )

  // Watch for selected ROI changes
  watch(
    () => props.selectedROIId,
    () => {
      nextTick(() => updateROIOverlays())
    },
  )

  // Watch for measurements changes
  watch(
    () => props.measurements,
    () => {
      nextTick(() => updatePersistentMeasurementOverlays())
    },
    { deep: true },
  )

  // Watch for drawing mode changes
  watch(
    () => props.drawingMode,
    newMode => {
      console.log('[DziViewer] drawingMode prop changed to:', newMode)
      // Reset drawing state when mode changes
      resetDrawingState()

      // Clear measurement overlay when switching away from measure mode
      if (newMode !== 'measure') {
        removeMeasurementOverlay()
      }

      // Update cursor based on mode
      if (containerRef.value) {
        const canvas = containerRef.value.querySelector('.openseadragon-canvas') as HTMLElement
        if (canvas) {
          console.log('[DziViewer] Setting cursor to:', newMode === 'none' ? 'grab' : 'crosshair')
          canvas.style.cursor = newMode === 'none' ? 'grab' : 'crosshair'
        }
      }

      // Enable/disable mouse navigation
      if (newMode === 'none') {
        viewer.value?.setMouseNavEnabled(true)
      } else {
        console.log('[DziViewer] Disabling mouse navigation for drawing')
        viewer.value?.setMouseNavEnabled(false)
      }
    },
  )

  // Lifecycle
  onMounted(() => {
    initViewer()
  })

  onBeforeUnmount(() => {
    destroyViewer()
  })

  // Expose public methods
  defineExpose({
    viewer,
    isReady,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    getZoom,
    panTo,
    rotateTo,
    rotateBy,
    getViewport,
    getBounds,
    fitBounds,
    goToPage,
    addOverlay,
    removeOverlay,
    clearOverlays,
    forceRedraw,
    setMouseNavEnabled,
    getTileSource,
    updateROIOverlays,
    clearMeasurement: removeMeasurementOverlay,
  })
</script>

<style scoped lang="scss">
.dzi-viewer-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
    rgba(var(--v-theme-surface), 0.98) 0%,
    rgba(var(--v-theme-surface-variant), 0.95) 100%
  );
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.loading-content {
  text-align: center;
  padding: 2rem;
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Thumbnail placeholder styles
.thumbnail-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 500;
  background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: blur(2px);
  transform: scale(1.02);
  opacity: 0.8;
}

.thumbnail-loading-indicator {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.loading-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
}

// Thumbnail fade transition
.thumbnail-fade-enter-active {
  transition: opacity 0.3s ease-out;
}

.thumbnail-fade-leave-active {
  transition: opacity 0.6s ease-out;
}

.thumbnail-fade-enter-from,
.thumbnail-fade-leave-to {
  opacity: 0;
}

.dzi-viewer-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
  transition: opacity 0.5s ease;

  &.viewer-loading {
    opacity: 0.3;
  }

  // OpenSeadragon navigator customization
  :deep(.navigator) {
    border: 2px solid rgb(var(--v-theme-primary));
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(var(--v-theme-primary), 0.2);
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    border-radius: 4px;
    transition: all 0.3s ease;

    &:hover {
      border-color: rgb(var(--v-theme-secondary));
      box-shadow:
        0 6px 16px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(var(--v-theme-secondary), 0.3);
    }

    .displayregion {
      border: 2px solid rgba(var(--v-theme-accent), 0.8) !important;
      box-shadow: 0 0 8px rgba(var(--v-theme-accent), 0.4);
    }
  }

  // ROI overlay - must receive pointer events
  :deep(.roi-overlay) {
    pointer-events: auto !important;
    cursor: pointer !important;
    z-index: 100 !important;
  }

  // Tile loading indicator
  :deep(.openseadragon-canvas) {
    cursor: grab;
    transition: filter 0.2s ease;

    &:active {
      cursor: grabbing;
    }
  }

  // Loading message
  :deep(.openseadragon-message) {
    background: rgba(var(--v-theme-surface), 0.95) !important;
    backdrop-filter: blur(8px);
    color: rgb(var(--v-theme-on-surface)) !important;
    padding: 12px 24px !important;
    border-radius: 8px !important;
    border: 1px solid rgba(var(--v-theme-primary), 0.2);
    font-family: inherit !important;
    font-size: 14px !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  // Controls
  :deep(.openseadragon-container) {
    .zoom-in,
    .zoom-out,
    .home,
    .fullpage {
      background: rgba(var(--v-theme-surface), 0.9) !important;
      backdrop-filter: blur(4px);
      border-radius: 4px !important;
      transition: all 0.2s ease !important;
      border: 1px solid rgba(var(--v-theme-primary), 0.2) !important;

      &:hover {
        background: rgba(var(--v-theme-primary), 0.9) !important;
        transform: scale(1.1);
        box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.4);
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }
}

// Smooth fade-in when viewer is ready
.viewer-ready {
  animation: viewerFadeIn 0.6s ease-out;
}

@keyframes viewerFadeIn {
  from {
    opacity: 0;
    filter: blur(4px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}
</style>
