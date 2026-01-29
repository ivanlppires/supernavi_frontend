# DziViewer Component

Professional TypeScript-ready component for viewing whole slide images (WSI) using OpenSeadragon.

## Features

✅ **Full TypeScript support** with proper typing
✅ **Comprehensive props** for all OpenSeadragon options
✅ **Rich event system** with typed emits
✅ **Public API** with exposed methods via template refs
✅ **Navigator customization** with SuperNavi theme colors
✅ **Reactive tile source** - change slides dynamically
✅ **Auto-cleanup** - viewer properly destroyed on unmount

## Installation

The component requires `openseadragon` and `@types/openseadragon`:

```bash
bun add openseadragon
bun add -d @types/openseadragon
```

## Basic Usage

```vue
<template>
  <DziViewer tile-source="/data/slide.dzi" />
</template>

<script setup lang="ts">
import DziViewer from '@/components/DziViewer.vue'
</script>
```

## Props

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tileSource` | `string \| object \| object[]` | `'/data/test.dzi'` | URL to DZI file or tile source config |
| `prefixUrl` | `string` | OpenSeadragon CDN | URL for OSD UI images |
| `showNavigator` | `boolean` | `true` | Show mini-map navigator |
| `showFullPageControl` | `boolean` | `false` | Show fullscreen button (handled by layout) |
| `showHomeControl` | `boolean` | `false` | Show home button (handled by toolbar) |
| `showZoomControl` | `boolean` | `false` | Show zoom controls (handled by toolbar) |

### Zoom & Pan Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `minZoomLevel` | `number` | `0.5` | Minimum zoom level |
| `maxZoomLevel` | `number` | `50` | Maximum zoom level |
| `defaultZoomLevel` | `number` | `1` | Initial zoom level |
| `visibilityRatio` | `number` | `1.0` | Visible area ratio (0-1) |
| `constrainDuringPan` | `boolean` | `true` | Prevent panning outside bounds |

### Animation Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animationTime` | `number` | `0.8` | Animation duration (seconds) |
| `blendTime` | `number` | `0.1` | Tile blend time (seconds) |

### Advanced Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `degrees` | `number` | `0` | Initial rotation in degrees |
| `imageSmoothingEnabled` | `boolean` | `true` | Enable image anti-aliasing |
| `preserveViewport` | `boolean` | `true` | Preserve viewport on resize |
| `mouseNavEnabled` | `boolean` | `true` | Enable mouse navigation |
| `controlsFadeDelay` | `number` | `2000` | Controls fade timeout (ms) |

## Events

The component emits comprehensive typed events:

```vue
<template>
  <DziViewer
    @viewer-ready="onViewerReady"
    @open="onSlideLoaded"
    @open-failed="onLoadFailed"
    @zoom="onZoom"
    @pan="onPan"
    @viewport-change="onViewportChange"
  />
</template>

<script setup lang="ts">
import type OpenSeadragon from 'openseadragon'

const onViewerReady = (viewer: OpenSeadragon.Viewer) => {
  console.log('Viewer ready:', viewer)
}

const onSlideLoaded = (event: OpenSeadragon.ViewerEvent) => {
  console.log('Slide loaded successfully')
}

const onLoadFailed = (event: OpenSeadragon.ViewerEvent) => {
  console.error('Failed to load slide')
}

const onZoom = (event: OpenSeadragon.ViewerEvent) => {
  console.log('Zoom changed')
}

const onViewportChange = (viewport: OpenSeadragon.Viewport) => {
  const zoom = viewport.getZoom()
  const center = viewport.getCenter()
  console.log('Viewport:', { zoom, center })
}
</script>
```

### Available Events

- `viewer-ready` - Viewer initialized (receives `OpenSeadragon.Viewer`)
- `open` - Slide loaded successfully
- `open-failed` - Slide failed to load
- `tile-loaded` - Individual tile loaded
- `zoom` - Zoom level changed
- `pan` - Viewport panned
- `rotate` - Rotation changed
- `animation-start` - Animation started
- `animation-finish` - Animation completed
- `canvas-click` - Canvas clicked
- `canvas-drag` - Canvas dragged
- `viewport-change` - Viewport changed (zoom/pan)
- `update-viewport` - Viewport update after animation
- `full-screen` - Fullscreen state changed

## Public API (Template Refs)

Access viewer methods via template ref:

```vue
<template>
  <div>
    <DziViewer ref="viewerRef" />
    <v-btn @click="handleZoomIn">Zoom In</v-btn>
    <v-btn @click="handleZoomOut">Zoom Out</v-btn>
    <v-btn @click="handleReset">Reset</v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DziViewer from '@/components/DziViewer.vue'

const viewerRef = ref<InstanceType<typeof DziViewer> | null>(null)

const handleZoomIn = () => {
  viewerRef.value?.zoomIn(1.5) // Zoom by factor 1.5
}

const handleZoomOut = () => {
  viewerRef.value?.zoomOut(0.7)
}

const handleReset = () => {
  viewerRef.value?.resetZoom()
}
</script>
```

### Exposed Methods

#### Zoom Methods
- `zoomIn(factor?: number)` - Zoom in by factor (default: 1.2)
- `zoomOut(factor?: number)` - Zoom out by factor (default: 0.8)
- `resetZoom()` - Reset to home view
- `setZoom(level: number, immediately?: boolean)` - Set specific zoom level
- `getZoom()` - Get current zoom level

#### Navigation Methods
- `panTo(x: number, y: number, immediately?: boolean)` - Pan to coordinates
- `rotateTo(degrees: number, immediately?: boolean)` - Rotate to specific angle
- `rotateBy(degrees: number)` - Rotate by relative angle

#### Viewport Methods
- `getViewport()` - Get OpenSeadragon viewport instance
- `getBounds()` - Get current viewport bounds
- `fitBounds(bounds: OpenSeadragon.Rect, immediately?: boolean)` - Fit viewport to bounds

#### Overlay Methods
- `addOverlay(element, location, placement?)` - Add overlay element
- `removeOverlay(element)` - Remove overlay
- `clearOverlays()` - Clear all overlays

#### Utility Methods
- `forceRedraw()` - Force viewer redraw
- `setMouseNavEnabled(enabled: boolean)` - Enable/disable mouse navigation
- `getTileSource()` - Get current tile source
- `goToPage(index: number)` - Navigate to page (multi-image sequences)

## Integration with Layout

Use inside the SuperNavi layout's viewer container:

```vue
<!-- app/src/pages/viewer.vue -->
<template>
  <div class="viewer-page">
    <DziViewer
      ref="dziViewerRef"
      :tile-source="currentSlide"
      @viewer-ready="handleViewerReady"
      @zoom="handleZoomChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DziViewer from '@/components/DziViewer.vue'
import type OpenSeadragon from 'openseadragon'

const dziViewerRef = ref<InstanceType<typeof DziViewer> | null>(null)
const currentSlide = ref('/data/case-12345/slide-001.dzi')

const handleViewerReady = (viewer: OpenSeadragon.Viewer) => {
  console.log('[Viewer Page] OpenSeadragon ready')

  // Example: Add custom overlay
  // viewer.addOverlay(...)
}

const handleZoomChange = () => {
  const zoom = dziViewerRef.value?.getZoom()
  console.log('Current zoom:', zoom)
}

// Connect layout toolbar buttons to viewer methods
defineExpose({
  zoomIn: () => dziViewerRef.value?.zoomIn(),
  zoomOut: () => dziViewerRef.value?.zoomOut(),
  resetView: () => dziViewerRef.value?.resetZoom()
})
</script>

<style scoped lang="scss">
.viewer-page {
  width: 100%;
  height: 100%;
}
</style>
```

## Advanced: Multiple Slides (Sequence)

```vue
<template>
  <DziViewer
    :tile-source="slides"
    show-sequence-control
    :preload-sequence="true"
    @viewer-ready="onReady"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const slides = ref([
  '/data/slide-001.dzi',
  '/data/slide-002.dzi',
  '/data/slide-003.dzi'
])

const onReady = (viewer) => {
  // Navigate between slides
  viewer.goToPage(1)
}
</script>
```

## Advanced: Custom Overlays (Annotations)

```vue
<template>
  <DziViewer ref="viewerRef" @viewer-ready="addAnnotation" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OpenSeadragon from 'openseadragon'

const viewerRef = ref<InstanceType<typeof DziViewer> | null>(null)

const addAnnotation = () => {
  // Create annotation element
  const annotation = document.createElement('div')
  annotation.style.background = 'rgba(255, 0, 0, 0.3)'
  annotation.style.border = '2px solid red'
  annotation.textContent = 'ROI'

  // Add to viewer at specific location
  const rect = new OpenSeadragon.Rect(0.5, 0.5, 0.2, 0.2)
  viewerRef.value?.addOverlay(annotation, rect)
}
</script>
```

## Styling

The component uses scoped SCSS with SuperNavi theme colors:

```scss
// Navigator border uses primary theme color
.navigator {
  border: 2px solid rgba(var(--v-theme-primary), 1);
}

// Custom cursor for grab/grabbing
.openseadragon-canvas {
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}
```

## Troubleshooting

### Slide not loading

1. Check DZI file path is correct
2. Verify DZI XML and tiles are accessible
3. Check browser console for CORS errors
4. Listen to `@open-failed` event for details

### Navigator not showing

- Set `show-navigator` to `true`
- Ensure slide has loaded successfully
- Check navigator styling (might be hidden by z-index)

### Performance issues

- Reduce `maxZoomLevel` for very large slides
- Increase `blendTime` for slower connections
- Disable `imageSmoothingEnabled` on low-end devices

## License

Part of SuperNavi project.
