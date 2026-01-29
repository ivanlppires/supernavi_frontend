<template>
  <v-tooltip location="bottom">
    <template #activator="{ props }">
      <v-chip
        v-bind="props"
        class="tile-source-badge"
        :color="chipColor"
        :prepend-icon="chipIcon"
        size="small"
        variant="tonal"
      >
        {{ chipLabel }}
      </v-chip>
    </template>
    <div class="tooltip-content">
      <div class="tooltip-title">{{ tooltipTitle }}</div>
      <div v-if="tooltipSubtitle" class="tooltip-subtitle">{{ tooltipSubtitle }}</div>
    </div>
  </v-tooltip>
</template>

<script setup lang="ts">
  import type { TileSourceOrigin } from '@/composables/useEdgeFirstTileSource'
  import { computed } from 'vue'

  interface Props {
    origin: TileSourceOrigin
    edgeAgentId?: string
    fallbackReason?: string | null
    edgeAvailable?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    origin: 'unknown',
    edgeAgentId: '',
    fallbackReason: null,
    edgeAvailable: false,
  })

  const chipColor = computed(() => {
    switch (props.origin) {
      case 'local': {
        return 'success'
      }
      case 'cloud': {
        return 'info'
      }
      default: {
        return 'grey'
      }
    }
  })

  const chipIcon = computed(() => {
    switch (props.origin) {
      case 'local': {
        return 'mdi-lan'
      }
      case 'cloud': {
        return 'mdi-cloud'
      }
      default: {
        return 'mdi-help-circle'
      }
    }
  })

  const chipLabel = computed(() => {
    switch (props.origin) {
      case 'local': {
        return 'LOCAL'
      }
      case 'cloud': {
        return 'CLOUD'
      }
      default: {
        return '...'
      }
    }
  })

  const tooltipTitle = computed(() => {
    switch (props.origin) {
      case 'local': {
        return `Carregando do agente local (${props.edgeAgentId || 'edge'})`
      }
      case 'cloud': {
        return 'Carregando do servidor cloud (preview)'
      }
      default: {
        return 'Fonte de tiles desconhecida'
      }
    }
  })

  const tooltipSubtitle = computed(() => {
    if (props.origin === 'cloud' && props.fallbackReason) {
      return `Motivo: ${props.fallbackReason}`
    }
    if (props.origin === 'local') {
      return 'Tiles em resolução total disponíveis'
    }
    return null
  })
</script>

<style scoped>
.tile-source-badge {
  font-weight: 600;
  letter-spacing: 0.5px;
}

.tooltip-content {
  max-width: 300px;
}

.tooltip-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.tooltip-subtitle {
  font-size: 12px;
  opacity: 0.8;
}
</style>
