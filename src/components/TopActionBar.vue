<script setup lang="ts">
import { computed } from 'vue'
import { useNetSelectorStore } from '@/store/netSelector'

const netStore = useNetSelectorStore()

const currentCity = computed(() => '成都市')

function onClearGrid() {
  // TODO: clear grid on map
}
</script>

<template>
  <div class="top-action-bar">
    <div class="city-btn">
      <van-icon name="location-o" size="16" />
      <span>{{ currentCity }}</span>
      <van-icon name="arrow-down" size="12" />
    </div>

    <div class="grid-controls">
      <div class="control-item">
        <span class="label">范围</span>
        <span class="value">{{ (netStore.range / 1000).toFixed(1) }}km</span>
      </div>
      <div class="control-item">
        <span class="label">网格</span>
        <span class="value">{{ netStore.gridSize }}m</span>
      </div>
      <button class="clear-btn" @click="onClearGrid">清除</button>
    </div>
  </div>
</template>

<style scoped>
.top-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 12px;
  padding-top: env(safe-area-inset-top, 0px);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border);
}

.city-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: var(--color-bg);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

.grid-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.control-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.label {
  color: var(--color-text-secondary);
}

.value {
  font-weight: 600;
  color: var(--color-primary);
}

.clear-btn {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  color: var(--color-text);
  min-height: 32px;
}
</style>
