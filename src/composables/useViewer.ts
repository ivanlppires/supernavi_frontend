import type OpenSeadragon from 'openseadragon'
import type DziViewer from '@/components/DziViewer.vue'
import { computed, ref, type Ref } from 'vue'

// ROI Types
export interface ROICoordinates {
  x: number
  y: number
  width: number
  height: number
}

export interface ROI {
  id: number
  name: string
  color: string
  type: 'rectangle' | 'arrow'
  coordinates: ROICoordinates
  isSelected?: boolean
}

export type DrawingMode = 'none' | 'rectangle' | 'arrow' | 'measure'

export interface MeasurementResult {
  id: number
  startPoint: { x: number, y: number }
  endPoint: { x: number, y: number }
  distancePixels: number
  distanceMicrons: number
  distanceFormatted: string
}

export interface DrawingState {
  mode: DrawingMode
  isDrawing: boolean
  startPoint: { x: number, y: number } | null
  points: Array<{ x: number, y: number }>
  previewCoordinates: ROICoordinates | null
  // Measurement specific
  measurementResult: MeasurementResult | null
}

// Slide type for the slide selector
export interface ViewerSlide {
  id: string
  name: string
  stain: string
  tileSource: string
}

export interface ViewerState {
  isReady: boolean
  isLoading: boolean
  zoomLevel: number
  scaleBar: string
  tilesLoaded: number
  totalTiles: number
  mouseCoords: { x: number, y: number } | null
  rotation: number
  caseName: string
  slideName: string
  activeROIs: ROI[]
  selectedROIId: number | null
  activeMeasurements: MeasurementResult[]
  showMarkers: boolean // Toggle to show/hide all markers (ROIs and measurements)
  // Slide list for case
  slides: ViewerSlide[]
  activeSlideId: string
}

export interface ViewerControls {
  // Viewer instance
  viewerInstance: Ref<OpenSeadragon.Viewer | null>
  componentRef: Ref<InstanceType<typeof DziViewer> | null>

  // State
  state: Ref<ViewerState>

  // Computed
  isViewerReady: Ref<boolean>
  loadingProgress: Ref<string>

  // Methods
  registerViewer: (ref: InstanceType<typeof DziViewer>) => void
  unregisterViewer: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  setZoom: (level: number) => void
  panTo: (x: number, y: number) => void
  rotateTo: (degrees: number) => void
  rotateBy: (degrees: number) => void
  updateZoom: (zoom: number) => void
  updateMouseCoords: (coords: { x: number, y: number } | null) => void
  updateTilesLoaded: (count: number) => void
  setSlideInfo: (caseName: string, slideName: string) => void

  // ROI Methods
  setROIs: (rois: ROI[]) => void
  goToROI: (roiId: number, padding?: number) => void
  selectROI: (roiId: number | null) => void
  updateROICoordinates: (roiId: number, coordinates: ROICoordinates) => void
  createROI: (data: Omit<ROI, 'id'>) => ROI
  deleteROI: (roiId: number) => void
  onROIClick: (callback: (roiId: number) => void) => void
  handleROIClick: (roiId: number) => void
  onROIDelete: (callback: (roiId: number) => void) => void
  handleROIDelete: (roiId: number) => void

  // Drawing Methods
  drawingState: Ref<DrawingState>
  setDrawingMode: (mode: DrawingMode) => void
  cancelDrawing: () => void
  onDrawingComplete: (callback: (coordinates: ROICoordinates, type: 'rectangle' | 'arrow') => void) => void
  handleDrawingComplete: (coordinates: ROICoordinates, type: 'rectangle' | 'arrow') => void

  // Measurement Methods
  onMeasurementComplete: (callback: (result: Omit<MeasurementResult, 'id'>) => void) => void
  handleMeasurementComplete: (result: Omit<MeasurementResult, 'id'>) => void
  clearMeasurement: () => void
  addMeasurement: (measurement: Omit<MeasurementResult, 'id'>) => MeasurementResult
  deleteMeasurement: (id: number) => void
  clearAllMeasurements: () => void

  // Slide Methods
  setSlides: (slides: ViewerSlide[]) => void
  setActiveSlideId: (slideId: string) => void
  onSlideChange: (callback: (slideId: string) => void) => void
}

// Global viewer state (singleton)
const viewerInstance = ref<OpenSeadragon.Viewer | null>(null)
const componentRef = ref<InstanceType<typeof DziViewer> | null>(null)

const state = ref<ViewerState>({
  isReady: false,
  isLoading: false,
  zoomLevel: 1,
  scaleBar: '100 µm',
  tilesLoaded: 0,
  totalTiles: 0,
  mouseCoords: null,
  rotation: 0,
  caseName: '',
  slideName: '',
  activeROIs: [],
  selectedROIId: null,
  activeMeasurements: [],
  showMarkers: true,
  slides: [],
  activeSlideId: '',
})

// ROI click callback
let roiClickCallback: ((roiId: number) => void) | null = null

// ROI delete callback
let roiDeleteCallback: ((roiId: number) => void) | null = null

// Drawing complete callback
let drawingCompleteCallback: ((coordinates: ROICoordinates, type: 'rectangle' | 'arrow') => void) | null = null

// Measurement complete callback
let measurementCompleteCallback: ((result: Omit<MeasurementResult, 'id'>) => void) | null = null

// Slide change callback
let slideChangeCallback: ((slideId: string) => void) | null = null

// Drawing state
const drawingState = ref<DrawingState>({
  mode: 'none',
  isDrawing: false,
  startPoint: null,
  points: [],
  previewCoordinates: null,
  measurementResult: null,
})

// ROI ID counter
let nextROIId = 1000

// Measurement ID counter
let nextMeasurementId = 1

export function useViewer (): ViewerControls {
  // Computed
  const isViewerReady = computed(() => state.value.isReady)

  const loadingProgress = computed(() => {
    if (!state.value.isReady && state.value.isLoading) {
      return 'Loading slide...'
    }
    if (state.value.tilesLoaded > 0 && state.value.totalTiles > 0) {
      const percent = Math.round((state.value.tilesLoaded / state.value.totalTiles) * 100)
      return `Loading: ${percent}%`
    }
    return 'Ready'
  })

  // Methods
  const registerViewer = (ref: InstanceType<typeof DziViewer>) => {
    componentRef.value = ref
    viewerInstance.value = ref.viewer
    state.value.isReady = true
    console.log('[useViewer] Viewer registered')
  }

  const unregisterViewer = () => {
    componentRef.value = null
    viewerInstance.value = null
    state.value.isReady = false
    console.log('[useViewer] Viewer unregistered')
  }

  const zoomIn = () => {
    if (componentRef.value) {
      componentRef.value.zoomIn()
      const newZoom = componentRef.value.getZoom()
      if (newZoom) {
        state.value.zoomLevel = Math.round(newZoom * 10) / 10
      }
    }
  }

  const zoomOut = () => {
    if (componentRef.value) {
      componentRef.value.zoomOut()
      const newZoom = componentRef.value.getZoom()
      if (newZoom) {
        state.value.zoomLevel = Math.round(newZoom * 10) / 10
      }
    }
  }

  const resetView = () => {
    componentRef.value?.resetZoom()
    state.value.zoomLevel = 1
    state.value.rotation = 0
  }

  const setZoom = (level: number) => {
    componentRef.value?.setZoom(level)
    state.value.zoomLevel = Math.round(level * 10) / 10
  }

  const panTo = (x: number, y: number) => {
    componentRef.value?.panTo(x, y)
  }

  const rotateTo = (degrees: number) => {
    componentRef.value?.rotateTo(degrees)
    state.value.rotation = degrees
  }

  const rotateBy = (degrees: number) => {
    componentRef.value?.rotateBy(degrees)
    state.value.rotation = (state.value.rotation + degrees) % 360
  }

  const updateZoom = (zoom: number) => {
    state.value.zoomLevel = Math.round(zoom * 10) / 10

    // Calculate scale bar based on zoom
    // This is a simplified calculation - you'll need to adjust based on your slide's MPP (microns per pixel)
    const baseMicrons = 1000 // 1mm at zoom 1x
    const currentMicrons = baseMicrons / zoom

    state.value.scaleBar = currentMicrons >= 1000 ? `${Math.round(currentMicrons / 1000)} mm` : `${Math.round(currentMicrons)} µm`
  }

  const updateMouseCoords = (coords: { x: number, y: number } | null) => {
    state.value.mouseCoords = coords
  }

  const updateTilesLoaded = (count: number) => {
    state.value.tilesLoaded = count
  }

  const setSlideInfo = (caseName: string, slideName: string) => {
    state.value.caseName = caseName
    state.value.slideName = slideName
  }

  // ROI Methods
  const setROIs = (rois: ROI[]) => {
    state.value.activeROIs = rois
  }

  const goToROI = (roiId: number, padding = 0.2) => {
    const roi = state.value.activeROIs.find(r => r.id === roiId)
    if (!roi || !viewerInstance.value) {
      return
    }

    // Convert image coordinates to viewport coordinates
    const tiledImage = viewerInstance.value.world.getItemAt(0)
    if (!tiledImage) {
      return
    }

    const imageRect = tiledImage.imageToViewportRectangle(
      roi.coordinates.x,
      roi.coordinates.y,
      roi.coordinates.width,
      roi.coordinates.height,
    )

    // Add padding
    const paddedRect = imageRect.clone()
    const paddingX = imageRect.width * padding
    const paddingY = imageRect.height * padding
    paddedRect.x -= paddingX
    paddedRect.y -= paddingY
    paddedRect.width += paddingX * 2
    paddedRect.height += paddingY * 2

    // Animate to the ROI
    viewerInstance.value.viewport.fitBounds(paddedRect, false)

    // Select this ROI
    selectROI(roiId)
  }

  const selectROI = (roiId: number | null) => {
    state.value.selectedROIId = roiId
    // Update isSelected on all ROIs
    state.value.activeROIs = state.value.activeROIs.map(roi => ({
      ...roi,
      isSelected: roi.id === roiId,
    }))
  }

  const updateROICoordinates = (roiId: number, coordinates: ROICoordinates) => {
    state.value.activeROIs = state.value.activeROIs.map(roi =>
      roi.id === roiId ? { ...roi, coordinates } : roi,
    )
    console.log('[useViewer] ROI coordinates updated:', roiId, coordinates)
  }

  const createROI = (data: Omit<ROI, 'id'>): ROI => {
    const newROI: ROI = {
      ...data,
      id: nextROIId++,
    }
    state.value.activeROIs.push(newROI)
    console.log('[useViewer] ROI created:', newROI)
    return newROI
  }

  const deleteROI = (roiId: number) => {
    state.value.activeROIs = state.value.activeROIs.filter(roi => roi.id !== roiId)
    if (state.value.selectedROIId === roiId) {
      state.value.selectedROIId = null
    }
    console.log('[useViewer] ROI deleted:', roiId)
  }

  // Drawing Methods
  const setDrawingMode = (mode: DrawingMode) => {
    drawingState.value.mode = mode
    drawingState.value.isDrawing = false
    drawingState.value.startPoint = null
    drawingState.value.points = []
    drawingState.value.previewCoordinates = null
    console.log('[useViewer] Drawing mode set:', mode)
  }

  const cancelDrawing = () => {
    drawingState.value.isDrawing = false
    drawingState.value.startPoint = null
    drawingState.value.points = []
    drawingState.value.previewCoordinates = null
    console.log('[useViewer] Drawing cancelled')
  }

  const onDrawingComplete = (callback: (coordinates: ROICoordinates, type: 'rectangle' | 'arrow') => void) => {
    drawingCompleteCallback = callback
  }

  const handleDrawingComplete = (coordinates: ROICoordinates, type: 'rectangle' | 'arrow') => {
    // Reset drawing mode
    setDrawingMode('none')

    // Call the callback if registered
    if (drawingCompleteCallback) {
      drawingCompleteCallback(coordinates, type)
    }
  }

  const onROIClick = (callback: (roiId: number) => void) => {
    roiClickCallback = callback
  }

  // Called by DziViewer when a ROI overlay is clicked
  const handleROIClick = (roiId: number) => {
    if (roiClickCallback) {
      roiClickCallback(roiId)
    }
  }

  const onROIDelete = (callback: (roiId: number) => void) => {
    roiDeleteCallback = callback
  }

  // Called by DziViewer when a ROI delete button is clicked
  const handleROIDelete = (roiId: number) => {
    console.log('[useViewer] handleROIDelete:', roiId, 'hasCallback:', !!roiDeleteCallback)
    if (roiDeleteCallback) {
      roiDeleteCallback(roiId)
    }
  }

  // Measurement Methods
  const onMeasurementComplete = (callback: (result: Omit<MeasurementResult, 'id'>) => void) => {
    measurementCompleteCallback = callback
  }

  const handleMeasurementComplete = (result: Omit<MeasurementResult, 'id'>) => {
    drawingState.value.measurementResult = result as MeasurementResult
    // Keep measurement mode active for continuous measuring
    // drawingState.value.mode = 'none' - Don't reset mode!
    drawingState.value.isDrawing = false

    // Call the callback if registered
    if (measurementCompleteCallback) {
      measurementCompleteCallback(result)
    }
    console.log('[useViewer] Measurement complete:', result)
  }

  const clearMeasurement = () => {
    drawingState.value.measurementResult = null
    console.log('[useViewer] Measurement cleared')
  }

  const addMeasurement = (measurement: Omit<MeasurementResult, 'id'>): MeasurementResult => {
    const newMeasurement: MeasurementResult = {
      ...measurement,
      id: nextMeasurementId++,
    }
    state.value.activeMeasurements.push(newMeasurement)
    console.log('[useViewer] Measurement added:', newMeasurement)
    return newMeasurement
  }

  const deleteMeasurement = (id: number) => {
    state.value.activeMeasurements = state.value.activeMeasurements.filter(m => m.id !== id)
    console.log('[useViewer] Measurement deleted:', id)
  }

  const clearAllMeasurements = () => {
    state.value.activeMeasurements = []
    console.log('[useViewer] All measurements cleared')
  }

  // Slide Methods
  const setSlides = (slides: ViewerSlide[]) => {
    state.value.slides = slides
    console.log('[useViewer] Slides set:', slides.length)
  }

  const setActiveSlideId = (slideId: string) => {
    state.value.activeSlideId = slideId
    console.log('[useViewer] Active slide set:', slideId)
    // Notify listeners
    if (slideChangeCallback) {
      slideChangeCallback(slideId)
    }
  }

  const onSlideChange = (callback: (slideId: string) => void) => {
    slideChangeCallback = callback
  }

  return {
    viewerInstance,
    componentRef,
    state,
    isViewerReady,
    loadingProgress,
    registerViewer,
    unregisterViewer,
    zoomIn,
    zoomOut,
    resetView,
    setZoom,
    panTo,
    rotateTo,
    rotateBy,
    updateZoom,
    updateMouseCoords,
    updateTilesLoaded,
    setSlideInfo,
    setROIs,
    goToROI,
    selectROI,
    updateROICoordinates,
    createROI,
    deleteROI,
    onROIClick,
    handleROIClick,
    onROIDelete,
    handleROIDelete,
    drawingState,
    setDrawingMode,
    cancelDrawing,
    onDrawingComplete,
    handleDrawingComplete,
    onMeasurementComplete,
    handleMeasurementComplete,
    clearMeasurement,
    addMeasurement,
    deleteMeasurement,
    clearAllMeasurements,
    setSlides,
    setActiveSlideId,
    onSlideChange,
  }
}
