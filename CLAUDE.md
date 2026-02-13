# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SuperNavi is a digital pathology viewer application for collaborative analysis of histological slides (WSI - Whole Slide Images) with AI support. The application is written in Portuguese (Brazilian).

## Development Commands

```bash
bun install          # Install dependencies
bun dev              # Development server (http://localhost:3000)
bun build            # Production build (runs type-check first)
bun type-check       # TypeScript type checking (vue-tsc)
bun lint             # ESLint with auto-fix
bun preview          # Preview production build
```

## Tech Stack

- **Vue 3** with Composition API (`<script setup>`)
- **Vuetify 3** for UI components
- **TypeScript** for type safety
- **Vite** as build tool
- **Pinia** for state management
- **OpenSeadragon** for DZI/WSI image viewing
- **Bun** as package manager and runtime

## Architecture

### Auto-imports and File-based Routing

The project uses several unplugin packages configured in `vite.config.mts`:
- **unplugin-vue-router**: File-based routing - pages in `src/pages/` auto-generate routes
- **unplugin-vue-components**: Components in `src/components/` are auto-imported globally
- **unplugin-auto-import**: Vue/Pinia APIs are auto-imported (no need to import `ref`, `computed`, etc.)
- **vite-plugin-vue-layouts-next**: Layout system - pages can specify layouts via `definePage({ meta: { layout: 'name' } })`

Path alias: Use `@/` for imports from `src/` (e.g., `import { apiClient } from '@/api/client'`).

### Viewer System

The core viewer architecture connects layout controls to the OpenSeadragon viewer:

1. **`useViewer` composable** (`src/composables/useViewer.ts`): Global singleton managing viewer state
   - Holds viewer instance, zoom level, mouse coordinates, ROIs, measurements
   - Provides methods: `zoomIn()`, `zoomOut()`, `resetView()`, `goToROI()`, etc.
   - Drawing modes: `'none' | 'rectangle' | 'arrow' | 'measure'`

2. **`DziViewer` component** (`src/components/DziViewer.vue`): OpenSeadragon wrapper
   - Handles tile loading, thumbnail placeholders, ROI overlays
   - Emits events for zoom, pan, tile loading, measurements

3. **Viewer page** (`src/pages/viewer.vue`): Orchestrates viewer with case/slide data
   - Registers viewer with composable on mount
   - Handles processing states for slide uploads

4. **Viewer layout** (`src/layouts/viewer.vue`): Full viewer UI
   - Topbar, floating toolbar, status bar, right panel (layers/annotations/AI)
   - Connects to `useViewer` for toolbar actions

### API Layer

All backend communication goes through `src/api/`:
- **`client.ts`**: Base API client with token management (localStorage key: `supernavi_token`)
- API modules: `auth.ts`, `cases.ts`, `slides.ts`, `annotations.ts`, `ai.ts`, `notifications.ts`, `users.ts`
- **`s3.ts`**: Signed URL handling for DZI tiles with caching
- Types defined in `types.ts`

Backend URL: `VITE_API_URL` env var (default: `https://cloud.supernavi.app`)

### State Management

Pinia stores in `src/stores/`:
- **`useAuthStore`** (`auth.ts`): Authentication, user profile, settings
  - Supports email/password, Google, and Apple login
  - Caches user in localStorage (`supernavi_user`)

Additional composables in `src/composables/`:
- **`useCases`**: Case listing, search, and CRUD operations
- **`useSlides`**: Slide management for cases
- **`useNotifications`**: Real-time notifications
- **`useGoogleSignIn`**: Google OAuth integration
- **`useEdgeStatus`**: Edge agent availability monitoring

### Theming

Apple-inspired color palette in `src/plugins/vuetify.ts`:
- Primary: `#007AFF` / `#0A84FF` (Apple blue)
- Secondary: `#5856D6` / `#5E5CE6` (Apple purple)
- Accent: `#34C759` / `#30D158` (Apple green)
- Two themes: `medicalLight` and `medicalDark`

Component defaults: buttons use `rounded: 'lg'` and no text-transform (no ALL CAPS).

## Key Patterns

### Composables for Shared State
Use composables (like `useViewer`) as singletons for state that needs to be shared across layout and page components.

### ROI/Annotation System
ROIs have image coordinates (x, y, width, height) and are rendered as overlays on the OpenSeadragon canvas. The viewer composable handles ROI CRUD and navigation (`goToROI` animates viewport to focus on an ROI).

### Slide Processing States
Slides can be in processing states after upload. The viewer page shows processing progress with stage indicators while tiles are being generated.

### Edge-First Tile Loading

The application supports an edge-first architecture for tile loading:

1. **`useEdgeFirstTileSource` composable** (`src/composables/useEdgeFirstTileSource.ts`): Automatic edge detection
   - Checks if local edge agent is available via `/edge/{agentId}/v1/health`
   - If available: loads tiles from `/edge/{agentId}/v1/slides/{slideId}/...`
   - If unavailable: falls back to cloud preview via `/preview/{slideId}/...`
   - All requests are same-origin (no direct localhost or S3 access)

2. **Environment variables**:
   - `VITE_EDGE_AGENT_ID`: Edge agent identifier (e.g., "lab01")
   - `VITE_EDGE_HEALTH_TIMEOUT_MS`: Health check timeout (default: 500ms)

3. **`TileSourceBadge` component**: Shows LOCAL/CLOUD indicator

See `docs/EDGE_TUNNEL_MVP.md` in the cloud repo for full architecture details.

## Layouts

Three layouts available in `src/layouts/`:
- **`default.vue`**: Standard app layout with navigation
- **`viewer.vue`**: Full viewer UI with topbar, floating toolbar, status bar, and right panel
- **`blank.vue`**: Minimal layout for auth pages

Pages specify their layout via `definePage({ meta: { layout: 'viewer' } })`.
