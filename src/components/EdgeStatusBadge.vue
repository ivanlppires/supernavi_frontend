<script setup lang="ts">
  import { useEdgeStatus } from '@/composables/useEdgeStatus'

  const {
    isChecking,
    edgeConnected,
    statusText,
    refresh,
  } = useEdgeStatus()
</script>

<template>
  <v-tooltip location="bottom" :open-delay="300">
    <template #activator="{ props }">
      <button
        v-bind="props"
        class="edge-status-badge"
        :class="{ 'is-connected': edgeConnected }"
        @click="refresh"
      >
        <span class="status-dot" />
        <span class="status-text">{{ edgeConnected ? 'Local' : 'Cloud' }}</span>
        <v-progress-circular
          v-if="isChecking"
          class="status-loader"
          indeterminate
          size="8"
          width="1"
        />
      </button>
    </template>
    <span>{{ statusText }}</span>
  </v-tooltip>
</template>

<style scoped>
.edge-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border: none;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.edge-status-badge:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.edge-status-badge:active {
  transform: scale(0.97);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.3);
  transition: all 0.2s ease;
}

.edge-status-badge.is-connected .status-dot {
  background: #34c759;
  box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.2);
}

.status-text {
  font-size: 0.6875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
  letter-spacing: 0.01em;
}

.status-loader {
  color: rgba(var(--v-theme-on-surface), 0.4);
}
</style>
