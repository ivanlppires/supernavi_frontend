<template>
  <div
    class="case-card"
    :class="{ 'is-processing': isProcessing, 'is-dragging': isDragging, 'is-dark': isDark, 'is-loading': isLoadingPreview }"
    draggable="true"
    @click="emit('click')"
    @dragend="handleDragEnd"
    @dragstart="handleDragStart"
  >
    <!-- Thumbnail Section -->
    <div class="card-thumbnail">
      <!-- Loading preview state with skeleton -->
      <template v-if="isLoadingPreview">
        <v-skeleton-loader
          class="thumbnail-skeleton"
          type="image"
        />
        <div class="loading-preview-overlay">
          <v-progress-circular
            color="primary"
            indeterminate
            size="28"
            width="2"
          />
          <span class="loading-preview-text">Carregando preview...</span>
        </div>
      </template>
      <!-- Carousel for multiple thumbnails -->
      <template v-else-if="currentThumbnailUrl">
        <!-- Skeleton while image is loading -->
        <v-skeleton-loader
          v-if="isImageLoading"
          class="thumbnail-skeleton"
          type="image"
        />
        <Transition mode="out-in" name="carousel-fade">
          <img
            :key="currentSlideIndex"
            :alt="`${caseItem.patientName} - Lâmina ${currentSlideIndex + 1}`"
            class="thumbnail-image"
            :class="{ 'thumbnail-hidden': isImageLoading }"
            :src="currentThumbnailUrl"
            @error="handleThumbnailError(currentSlideIndex)"
            @load="handleImageLoad"
          >
        </Transition>

        <!-- Carousel Navigation (only if multiple thumbnails) -->
        <template v-if="hasMultipleThumbnails && !isProcessing">
          <!-- Previous Button -->
          <button class="carousel-nav carousel-prev" @click="prevSlide">
            <v-icon color="white" size="16">mdi-chevron-left</v-icon>
          </button>
          <!-- Next Button -->
          <button class="carousel-nav carousel-next" @click="nextSlide">
            <v-icon color="white" size="16">mdi-chevron-right</v-icon>
          </button>
          <!-- Dots Indicator -->
          <div class="carousel-dots">
            <button
              v-for="(_, index) in validThumbnails"
              :key="index"
              class="carousel-dot"
              :class="{ active: index === currentSlideIndex }"
              @click="goToSlide(index, $event)"
            />
          </div>
        </template>
      </template>
      <div v-else class="thumbnail-placeholder">
        <v-icon color="grey-lighten-1" size="40">mdi-microscope</v-icon>
      </div>

      <!-- Processing Overlay -->
      <div v-if="isProcessing" class="processing-overlay">
        <div class="processing-content">
          <v-progress-circular
            class="progress-ring"
            color="white"
            :indeterminate="isIndeterminate"
            :model-value="displayProgress"
            :rotate="-90"
            size="48"
            width="3"
          />
          <span v-if="!isIndeterminate" class="progress-percent">{{ displayProgress }}%</span>
          <v-icon v-else class="progress-icon" color="white" size="18">mdi-cog</v-icon>
        </div>
        <span class="processing-label">{{ processingInfo.stageLabel }}</span>
      </div>

      <!-- Slides Count Badge -->
      <div v-if="!isProcessing && slidesCount > 0" class="slides-badge">
        <v-icon size="12">mdi-image-multiple</v-icon>
        <span>{{ slidesCount }}</span>
      </div>
    </div>

    <!-- Card Content -->
    <div class="card-content">
      <!-- Patient Name -->
      <h3 class="patient-name">{{ caseItem.patientName }}</h3>

      <!-- Case Number & Date -->
      <div class="case-meta">
        <span class="case-number">{{ caseItem.caseNumber }}</span>
        <span class="meta-separator">|</span>
        <span class="case-date">{{ formatDate(caseItem.createdAt) }}</span>
      </div>

      <!-- Patient Info & Ownership -->
      <div class="patient-info">
        <span v-if="caseItem.patientAge" class="info-pill">
          <v-icon class="info-icon" size="11">mdi-cake-variant-outline</v-icon>
          {{ caseItem.patientAge }} anos
        </span>
        <span v-if="caseItem.patientAge && caseItem.patientSex" class="info-separator">·</span>
        <span v-if="caseItem.patientSex" class="info-pill">
          <v-icon class="info-icon" size="11">{{ caseItem.patientSex === 'M' ? 'mdi-gender-male' : 'mdi-gender-female' }}</v-icon>
          {{ caseItem.patientSex === 'M' ? 'Masc.' : 'Fem.' }}
        </span>
        <span v-if="caseItem.patientAge || caseItem.patientSex" class="info-separator">·</span>
        <span class="ownership-badge" :class="{ 'is-owner': caseItem.isOwner }">
          <v-icon size="11">{{ caseItem.isOwner ? 'mdi-account' : 'mdi-account-group' }}</v-icon>
          {{ caseItem.isOwner ? 'Meu caso' : (caseItem.ownerName || 'Colaboração') }}
        </span>
      </div>
    </div>

    <!-- Card Actions (on hover) -->
    <div class="card-actions" @click.stop>
      <button
        v-if="activeTab !== 'trash'"
        class="action-btn add-slides"
        title="Vincular lâminas"
        @click="$emit('add-slides')"
      >
        <v-icon size="18">mdi-link-plus</v-icon>
      </button>
<button class="action-btn more" title="Mais opções" @click.stop="showContextMenu = !showContextMenu">
        <v-icon size="18">mdi-dots-horizontal</v-icon>
      </button>

      <!-- Apple-like Context Menu -->
      <Transition name="menu-fade">
        <div v-if="showContextMenu" class="apple-context-menu" @click.stop>
          <div class="menu-backdrop" @click="showContextMenu = false" />
          <div class="menu-content">
            <button
              v-if="activeTab !== 'archived'"
              class="menu-item"
              @click="handleMenuAction('archived')"
            >
              <v-icon size="16">mdi-archive-arrow-down</v-icon>
              <span>Arquivar</span>
            </button>
            <button
              v-if="activeTab === 'archived'"
              class="menu-item"
              @click="handleMenuAction('inbox')"
            >
              <v-icon size="16">mdi-inbox-arrow-up</v-icon>
              <span>Mover para Caixa de Entrada</span>
            </button>
            <button
              v-if="activeTab !== 'trash'"
              class="menu-item destructive"
              @click="handleMenuAction('trash')"
            >
              <v-icon size="16">mdi-trash-can-outline</v-icon>
              <span>Mover para Lixeira</span>
            </button>
            <button
              v-if="activeTab === 'trash'"
              class="menu-item"
              @click="handleMenuAction('inbox')"
            >
              <v-icon size="16">mdi-restore</v-icon>
              <span>Restaurar</span>
            </button>
            <div v-if="activeTab === 'trash'" class="menu-divider" />
            <button
              v-if="activeTab === 'trash'"
              class="menu-item destructive"
              @click="handleDeleteAction"
            >
              <v-icon size="16">mdi-delete-forever-outline</v-icon>
              <span>Excluir Permanentemente</span>
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { ProcessingStatus } from '@/api/types'
  import type { CaseDisplay } from '@/composables/useCases'
  import { computed, ref, watch } from 'vue'
  import { useTheme } from 'vuetify'

  interface ProcessingInfo {
    status: ProcessingStatus | 'none'
    pendingCount: number
    processingCount: number
    uploadingCount: number
    readyCount: number
    failedCount: number
    totalCount: number
    progress: number
    stageLabel: string
  }

  const props = defineProps<{
    caseItem: CaseDisplay
    activeTab: 'inbox' | 'archived' | 'trash'
    processingInfo: ProcessingInfo
    thumbnailUrls: string[]
  }>()

  const emit = defineEmits<{
    'add-slides': []
    'click': []
    'confirm-delete': []
    'drag-end': [event: DragEvent]
    'drag-start': [event: DragEvent]
'move-to': [location: 'inbox' | 'archived' | 'trash']
    'thumbnail-error': []
  }>()

  const theme = useTheme()
  const isDark = computed(() => theme.global.current.value.dark)

  const isDragging = ref(false)
  const thumbnailErrors = ref<Set<number>>(new Set())
  const showContextMenu = ref(false)
  const currentSlideIndex = ref(0)
  const retryCounter = ref(0) // Used to bust cache on thumbnail retry
  const isImageLoading = ref(true) // Track image loading state

  // Carousel computed
  const validThumbnails = computed(() => {
    return props.thumbnailUrls.filter((url, index) => url && !thumbnailErrors.value.has(index))
  })

  const hasMultipleThumbnails = computed(() => validThumbnails.value.length > 1)

  const currentThumbnailUrl = computed(() => {
    if (validThumbnails.value.length === 0) return null
    const safeIndex = Math.min(currentSlideIndex.value, validThumbnails.value.length - 1)
    const baseUrl = validThumbnails.value[safeIndex] || null
    // Add cache-busting query param to force fresh request on retry
    if (baseUrl && retryCounter.value > 0) {
      const separator = baseUrl.includes('?') ? '&' : '?'
      return `${baseUrl}${separator}_r=${retryCounter.value}`
    }
    return baseUrl
  })

  // Reset loading state when thumbnail URL changes
  watch(currentThumbnailUrl, (newUrl, oldUrl) => {
    if (newUrl && newUrl !== oldUrl) {
      isImageLoading.value = true
    }
  })

  // Carousel navigation
  function nextSlide (event: Event) {
    event.stopPropagation()
    if (validThumbnails.value.length > 1) {
      isImageLoading.value = true
      currentSlideIndex.value = (currentSlideIndex.value + 1) % validThumbnails.value.length
    }
  }

  function prevSlide (event: Event) {
    event.stopPropagation()
    if (validThumbnails.value.length > 1) {
      isImageLoading.value = true
      currentSlideIndex.value = (currentSlideIndex.value - 1 + validThumbnails.value.length) % validThumbnails.value.length
    }
  }

  function goToSlide (index: number, event: Event) {
    event.stopPropagation()
    isImageLoading.value = true
    currentSlideIndex.value = index
  }

  const isProcessing = computed(() => {
    const status = props.processingInfo.status
    return status === 'processing' || status === 'uploading' || status === 'pending'
  })

  // Loading preview state: has slides, no thumbnail, not processing
  const isLoadingPreview = computed(() => {
    const hasSlides = (props.caseItem.slidesCount || 0) > 0
    const noThumbnail = validThumbnails.value.length === 0
    return hasSlides && noThumbnail && !isProcessing.value
  })

  const isIndeterminate = computed(() => {
    return props.processingInfo.progress <= 0
  })

  const displayProgress = computed(() => {
    return Math.max(0, props.processingInfo.progress)
  })

  const slidesCount = computed(() => props.caseItem.slidesCount || 0)


  function formatDate (dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Hoje'
    } else if (diffDays === 1) {
      return 'Ontem'
    } else if (diffDays < 7) {
      return `${diffDays} dias`
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    }
  }

  function handleDragStart (event: DragEvent) {
    isDragging.value = true
    event.dataTransfer?.setData('text/plain', props.caseItem.id)
    emit('drag-start', event)
  }

  function handleDragEnd (event: DragEvent) {
    isDragging.value = false
    emit('drag-end', event)
  }

  function handleImageLoad () {
    isImageLoading.value = false
  }

  const retryAttempts = ref<Map<number, number>>(new Map())
  const MAX_RETRIES = 3

  function handleThumbnailError (index: number) {
    isImageLoading.value = false
    thumbnailErrors.value.add(index)
    // Move to next valid thumbnail if current one failed
    if (validThumbnails.value.length > 0 && currentSlideIndex.value >= validThumbnails.value.length) {
      currentSlideIndex.value = 0
    }
    emit('thumbnail-error')

    const attempts = (retryAttempts.value.get(index) || 0) + 1
    retryAttempts.value.set(index, attempts)

    // Only retry up to MAX_RETRIES times
    if (attempts <= MAX_RETRIES) {
      setTimeout(() => {
        thumbnailErrors.value.delete(index)
        retryCounter.value++
      }, 3000 * attempts) // Increasing backoff
    }
  }

  function handleMenuAction (location: 'inbox' | 'archived' | 'trash') {
    showContextMenu.value = false
    emit('move-to', location)
  }

  function handleDeleteAction () {
    showContextMenu.value = false
    emit('confirm-delete')
  }
</script>

<style scoped lang="scss">
  .case-card {
    position: relative;
    background: rgb(var(--v-theme-surface));
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(var(--v-border-color), 0.12);

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

      .card-actions {
        opacity: 1;
        transform: translateY(0);
      }
    }

    &.is-processing {
      .card-thumbnail::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(2px);
      }
    }

    &.is-dragging {
      opacity: 0.6;
      transform: scale(0.98);
    }
  }

  .thumbnail-skeleton {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;

    :deep(.v-skeleton-loader__image) {
      height: 100%;
    }
  }

  .loading-preview-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    z-index: 2;
  }

  .loading-preview-text {
    font-size: 10px;
    font-weight: 600;
    color: rgba(var(--v-theme-on-surface), 0.45);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .card-thumbnail {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    background: linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%);
    overflow: hidden;
  }

  .thumbnail-image {
    width: 100%;
    height: 100%;
    object-fit: cover;

    &.thumbnail-hidden {
      opacity: 0;
      position: absolute;
    }
  }

  // Carousel transition
  .carousel-fade-enter-active,
  .carousel-fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .carousel-fade-enter-from,
  .carousel-fade-leave-to {
    opacity: 0;
  }

  // Carousel navigation
  .carousel-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: all 0.2s ease;
    z-index: 5;

    &:hover {
      background: rgba(0, 0, 0, 0.7);
    }

    .case-card:hover & {
      opacity: 1;
    }
  }

  .carousel-prev {
    left: 8px;
  }

  .carousel-next {
    right: 8px;
  }

  .carousel-dots {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
    z-index: 5;
  }

  .carousel-dot {
    width: 6px;
    height: 6px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 0;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.8);
    }

    &.active {
      background: white;
      transform: scale(1.2);
    }
  }

  .thumbnail-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #f5f5f7 0%, #e8e8eb 100%);
  }

  .waiting-label {
    font-size: 11px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.4);
    text-align: center;
    padding: 0 8px;
  }

  .processing-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }

  .processing-content {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
  }

  .progress-ring {
    position: absolute;
  }

  .progress-percent {
    font-size: 12px;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }

  .progress-icon {
    animation: spin 2s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .processing-label {
    font-size: 11px;
    font-weight: 500;
    color: white;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    text-align: center;
    padding: 0 12px;
    line-height: 1.3;
  }

  .slides-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    color: white;
  }

  .card-content {
    padding: 14px 16px 16px;
  }

  .patient-name {
    font-size: 15px;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
    margin: 0 0 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .case-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 10px;
  }

  .case-number {
    font-size: 12px;
    color: rgb(var(--v-theme-on-surface-variant));
    opacity: 0.7;
  }

  .meta-separator {
    font-size: 11px;
    color: rgb(var(--v-theme-on-surface-variant));
    opacity: 0.4;
  }

  .case-date {
    font-size: 11px;
    color: rgb(var(--v-theme-on-surface-variant));
    opacity: 0.6;
  }

  .patient-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .info-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    font-weight: 400;
    color: rgb(var(--v-theme-on-surface-variant));
    opacity: 0.65;
  }

  .info-icon {
    opacity: 0.7;
  }

  .info-separator {
    font-size: 12px;
    color: rgb(var(--v-theme-on-surface-variant));
    opacity: 0.4;
  }

  .ownership-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    font-weight: 400;
    color: #ff9500;
    opacity: 0.75;

    &.is-owner {
      color: rgb(var(--v-theme-on-surface-variant));
      opacity: 0.65;
    }
  }

  .card-actions {
    position: absolute;
    top: 8px;
    left: 8px;
    display: flex;
    gap: 6px;
    opacity: 0;
    transform: translateY(-4px);
    transition: all 0.2s ease;
    z-index: 10;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.15s ease;

    &:hover {
      transform: scale(1.08);
      background: white;
    }

    &:active {
      transform: scale(0.96);
    }

    &.loading {
      cursor: wait;
      opacity: 0.7;
    }

    .v-icon {
      color: rgb(var(--v-theme-on-surface));
      opacity: 0.8;
    }

    &.add-slides:hover .v-icon {
      color: rgb(var(--v-theme-primary));
      opacity: 1;
    }

    &.share:hover .v-icon {
      color: #ff9500;
      opacity: 1;
    }

    &.download:hover .v-icon {
      color: rgb(var(--v-theme-success));
      opacity: 1;
    }
  }

  // Apple-like Context Menu
  .apple-context-menu {
    position: absolute;
    top: 40px;
    left: 8px;
    z-index: 100;
  }

  .menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: -1;
  }

  .menu-content {
    min-width: 230px;
    padding: 6px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px) saturate(180%);
    border-radius: 12px;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.06),
      0 4px 16px rgba(0, 0, 0, 0.12),
      0 8px 32px rgba(0, 0, 0, 0.08);
    overflow: hidden;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    color: rgb(var(--v-theme-on-surface));
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    &:active {
      background: rgba(0, 0, 0, 0.1);
    }

    .v-icon {
      color: rgb(var(--v-theme-on-surface));
      opacity: 0.7;
    }

    &.destructive {
      color: #ff3b30;

      .v-icon {
        color: #ff3b30;
        opacity: 1;
      }

      &:hover {
        background: rgba(255, 59, 48, 0.1);
      }
    }
  }

  .menu-divider {
    height: 1px;
    margin: 6px 0;
    background: rgba(0, 0, 0, 0.08);
  }

  // Menu animation
  .menu-fade-enter-active {
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .menu-fade-leave-active {
    transition: all 0.1s cubic-bezier(0.4, 0, 1, 1);
  }

  .menu-fade-enter-from,
  .menu-fade-leave-to {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }

  // Dark mode styles
  .case-card.is-dark {
    background: rgb(var(--v-theme-surface));
    border-color: rgba(255, 255, 255, 0.08);

    &:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .thumbnail-placeholder {
      background: linear-gradient(135deg, #2c2c2e 0%, #1c1c1e 100%);
    }

    .waiting-label {
      color: rgba(255, 255, 255, 0.4);
    }

    .menu-content {
      background: rgba(44, 44, 46, 0.9);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.08),
        0 4px 16px rgba(0, 0, 0, 0.5),
        0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .menu-item {
      color: rgba(255, 255, 255, 0.9);

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      &:active {
        background: rgba(255, 255, 255, 0.15);
      }

      .v-icon {
        color: rgba(255, 255, 255, 0.7);
      }

      &.destructive {
        color: #ff453a;

        .v-icon {
          color: #ff453a;
        }

        &:hover {
          background: rgba(255, 69, 58, 0.15);
        }
      }
    }

    .menu-divider {
      background: rgba(255, 255, 255, 0.1);
    }

    .action-btn {
      background: rgba(30, 30, 30, 0.8);

      &:hover {
        background: rgba(40, 40, 40, 0.9);
      }

      .v-icon {
        color: white;
      }
    }

    .report-badge {
      background: rgba(10, 132, 255, 0.2);
      color: #0a84ff;

      &:hover:not(.disabled) {
        background: rgba(10, 132, 255, 0.3);
      }

      &.disabled {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.3);
      }
    }

    .case-date {
      color: rgba(255, 255, 255, 0.5);
    }
  }

</style>
