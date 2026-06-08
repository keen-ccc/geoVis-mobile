<script setup lang="ts">
import { ref, provide } from 'vue'
import TopActionBar from './TopActionBar.vue'
import MobileMap from './MobileMap.vue'
import BottomPanel from './BottomPanel.vue'

const mapRef = ref<InstanceType<typeof MobileMap> | null>(null)
provide('mapRef', mapRef)
</script>

<template>
  <div class="main-layout">
    <TopActionBar class="top-bar" />
    <div class="map-area">
      <MobileMap ref="mapRef" />
    </div>
    <BottomPanel class="bottom-panel" />
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.top-bar {
  flex-shrink: 0;
  z-index: 1000;
}

.map-area {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.bottom-panel {
  flex-shrink: 0;
  z-index: 900;
}
</style>
