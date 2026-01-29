# DziViewer + Layout Integration

Complete integration guide for the SuperNavi viewer system.

## What Was Done

### 1. Created Viewer Composable (`src/composables/useViewer.ts`)

A global state management composable that provides:

- **Global Viewer State**: Shared between layout and viewer page
- **Reactive State**: `zoomLevel`, `scaleBar`, `tilesLoaded`, `mouseCoords`, etc.
- **Control Methods**: `zoomIn()`, `zoomOut()`, `resetView()`, etc.
- **Registration System**: Pages register their viewer instances

**Benefits:**
- Single source of truth for viewer state
- Layout controls work with any page using the viewer
- Clean separation of concerns

### 2. Created Viewer Page (`src/pages/viewer.vue`)

A page component that:

- ✅ Integrates `DziViewer` component
- ✅ Registers viewer with global composable
- ✅ Handles all OpenSeadragon events
- ✅ Updates global state (zoom, tiles, mouse coords)
- ✅ Tracks tile loading progress
- ✅ Manages viewer lifecycle (mount/unmount)

### 3. Updated Layout (`src/layouts/default.vue`)

Connected layout UI to viewer composable:

**Topbar:**
- Case name now displays from `viewerControls.state.value.caseName`

**Floating Toolbar:**
- Zoom In button → `viewerControls.zoomIn()`
- Zoom Out button → `viewerControls.zoomOut()`
- Reset View button → `viewerControls.resetView()`
- Buttons disabled when viewer not ready

**Status Bar:**
- Zoom level → Real zoom from viewer
- Scale bar → Calculated based on zoom
- Tiles loaded → Actual tile count
- Mouse coords → Real image coordinates
- Loading indicator → Shows when slide is loading

### 4. Created Index Page (`src/pages/index.vue`)

Simple redirect to viewer page.

## File Structure

```
app/src/
├── components/
│   ├── DziViewer.vue        # OpenSeadragon wrapper component
│   └── DziViewer.md         # Component documentation
├── composables/
│   └── useViewer.ts         # Global viewer state management
├── layouts/
│   └── default.vue          # Main layout (connected to viewer)
└── pages/
    ├── index.vue            # Redirects to /viewer
    └── viewer.vue           # Main viewer page
```

## How It Works

### State Flow

```
┌─────────────────────────────────────────────────────────┐
│                    useViewer (global)                    │
│  - state (zoomLevel, tilesLoaded, mouseCoords, etc.)   │
│  - methods (zoomIn, zoomOut, resetView, etc.)          │
└──────────────┬─────────────────────────┬────────────────┘
               │                         │
               ▼                         ▼
    ┌──────────────────┐      ┌──────────────────┐
    │  Layout (UI)     │      │  Viewer Page     │
    │  - Toolbar       │      │  - DziViewer     │
    │  - Status Bar    │      │  - Event Handler │
    │  - Topbar        │      │  - State Updates │
    └──────────────────┘      └──────────────────┘
```

### Event Flow

1. **User clicks Zoom In** (in layout toolbar)
   → `viewerControls.zoomIn()` called
   → Composable calls `componentRef.value.zoomIn()`
   → DziViewer zooms in via OpenSeadragon
   → Viewer page `@zoom` event fires
   → `handleZoomChanged()` updates composable state
   → Layout status bar shows new zoom level

2. **User moves mouse** (in viewer)
   → OpenSeadragon canvas-drag event
   → Viewer page calculates image coordinates
   → Updates `viewerControls.updateMouseCoords()`
   → Layout status bar shows coordinates

## Testing the Integration

### 1. Start Development Server

```bash
cd app
bun dev
```

### 2. Open Browser

Navigate to `http://localhost:5173`

- Should auto-redirect to `/viewer`
- Should see SuperNavi layout with all UI elements

### 3. Test Viewer Loading

**Expected behavior:**
- ❌ DZI will fail to load (no `/data/test.dzi` file yet)
- ✅ Status bar shows "Loading slide..." initially
- ✅ Console shows "[ViewerPage] Failed to load slide"
- ✅ Toolbar buttons are disabled (no viewer ready)

### 4. Test with Real DZI (when available)

To test with a real slide:

1. Place your DZI file and tiles folder in `app/public/data/`
   ```
   public/
   └── data/
       ├── test.dzi
       └── test_files/
           └── (tile pyramid folders)
   ```

2. Or modify tile source in `viewer.vue`:
   ```ts
   const tileSource = ref('https://openseadragon.github.io/example-images/highsmith/highsmith.dzi')
   ```

**Expected behavior:**
- ✅ Slide loads successfully
- ✅ Status bar shows zoom level, scale, tiles loaded
- ✅ Toolbar buttons become active
- ✅ Zoom In/Out buttons work
- ✅ Reset View returns to home position
- ✅ Mouse coordinates update in status bar
- ✅ Navigator (mini-map) appears in bottom-right

### 5. Test Layout Features

**Topbar:**
- ✅ Mode selector switches between View/Annotate/AI/Report
- ✅ Case name displays when slide loads
- ✅ Fullscreen button works
- ✅ Profile menu opens

**Right Panel:**
- ✅ Can be collapsed/expanded
- ✅ Tabs switch between Layers/Annotations/AI/Details
- ✅ Layers can be toggled on/off
- ✅ Opacity sliders work
- ✅ Slide details show metadata

**Floating Toolbar:**
- ✅ Auto-hides in fullscreen after 3s
- ✅ Zoom buttons work when viewer ready
- ✅ Tooltips appear on hover

**Status Bar:**
- ✅ Shows real-time zoom level
- ✅ Shows calculated scale bar
- ✅ Shows tiles loaded count
- ✅ Shows mouse coordinates when hovering
- ✅ Becomes floating overlay in fullscreen

## Next Steps

### Immediate (Required for Testing)

1. **Get a test DZI slide:**
   - Generate from a WSI using VIPS or OpenSlide
   - Or use online examples
   - Place in `public/data/test.dzi`

2. **Verify loading works:**
   - Check browser console for errors
   - Verify tiles load from correct path
   - Test pan/zoom functionality

### Short-term Enhancements

1. **Connect Annotations:**
   - Create annotation drawing tools
   - Connect to floating toolbar ROI buttons
   - Store annotations in Pinia store
   - Display in right panel Annotations tab

2. **Connect Layers:**
   - Implement layer overlay system
   - Use DziViewer `addOverlay()` method
   - Connect to Layers tab toggles

3. **Connect AI Panel:**
   - Add heatmap overlay support
   - Implement mask rendering
   - Connect opacity sliders to overlays

4. **Improve Status Bar:**
   - Add real MPP (microns per pixel) calculation
   - Show accurate scale bar based on slide metadata
   - Add rotation indicator

### Medium-term Features

1. **Multi-slide Support:**
   - Implement slide selector
   - Preload next/previous slides
   - Support comparison mode (side-by-side)

2. **Annotations Persistence:**
   - Save/load annotations to backend
   - Export annotations as GeoJSON
   - Import ROIs from QuPath

3. **AI Integration:**
   - Load AI analysis results
   - Overlay heatmaps from backend
   - Display confidence scores

## Troubleshooting

### Viewer not connecting to layout

**Symptom:** Toolbar buttons don't work, status bar shows 0

**Solution:**
- Check browser console for registration message: `[useViewer] Viewer registered`
- Verify viewer page is mounted: `[ViewerPage] Mounted`
- Ensure viewer ready event fires: `[ViewerPage] OpenSeadragon ready`

### TypeScript errors

**Symptom:** `bun type-check` shows errors

**Solution:**
```bash
cd app
bun type-check
```

All should pass. If not, check:
- `@types/openseadragon` is installed
- Composable imports are correct
- No circular dependencies

### Slide fails to load

**Symptom:** Console shows "Failed to load slide"

**Possible causes:**
1. DZI file path incorrect
2. CORS issues (if loading from external URL)
3. Tiles folder not in correct location
4. DZI XML malformed

**Debug:**
- Open Network tab in DevTools
- Check if DZI file loads (should be XML)
- Check if tiles load (should be JPG/PNG)
- Verify folder structure matches DZI XML

### Layout UI not updating

**Symptom:** Status bar frozen, zoom doesn't change

**Solution:**
- Check if viewer events are firing (add console.log)
- Verify composable state is reactive (use Vue DevTools)
- Ensure viewer page calls `updateZoom()` on events

## Architecture Benefits

### 1. Decoupled Components
- Layout doesn't know about DziViewer internals
- Viewer page doesn't know about layout UI
- Composable is the single bridge

### 2. Testable
- Each component can be tested independently
- Mock composable for layout tests
- Mock viewer for page tests

### 3. Scalable
- Easy to add new pages with viewers
- Easy to add new toolbar tools
- Easy to extend state

### 4. Type-Safe
- Full TypeScript support
- Autocomplete in IDE
- Compile-time error checking

## Performance Notes

- **Tile loading:** Tracked in real-time via events
- **Mouse tracking:** Only updates when moving (not on every frame)
- **State updates:** Batched via Vue reactivity
- **Composable:** Singleton pattern (one instance globally)

## Security Considerations

- **DZI source:** Validate URLs before loading
- **Overlays:** Sanitize HTML before adding to viewer
- **Annotations:** Validate GeoJSON before parsing
- **Exports:** Sanitize filenames and paths

## License

Part of SuperNavi project.
