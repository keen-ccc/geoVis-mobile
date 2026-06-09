<script setup lang="ts">
import { ref, provide, computed } from 'vue'
import TopActionBar from './TopActionBar.vue'
import MobileMap from './MobileMap.vue'
import BottomPanel from './BottomPanel.vue'

const mapRef = ref<InstanceType<typeof MobileMap> | null>(null)
provide('mapRef', mapRef)

// Bottom panel drag state: 0 = collapsed, 1 = half, 2 = full
const panelState = ref(0)
const snapHeights = [0.12, 0.42, 0.72]  // % of viewport height
const panelHeight = computed(() => snapHeights[panelState.value])

// Touch drag
let startY = 0
let startState = 0

function onTouchStart(e: TouchEvent) {
  startY = e.touches[0].clientY
  startState = panelState.value
}

function onTouchMove(e: TouchEvent) {
  const dy = startY - e.touches[0].clientY  // positive = move up
  const threshold = window.innerHeight * 0.08
  if (dy > threshold && panelState.value < 2) {
    panelState.value = startState + 1
    startState = panelState.value
    startY = e.touches[0].clientY
  } else if (dy < -threshold && panelState.value > 0) {
    panelState.value = startState - 1
    startState = panelState.value
    startY = e.touches[0].clientY
  }
}

function togglePanel() {
  panelState.value = panelState.value === 0 ? 1 : 0
}
</script>

<template>
  <div class="main-layout">
    <TopActionBar class="top-bar" />
    <div class="map-area" :style="{ height: `${100 - panelHeight * 100}%` }">
      <MobileMap ref="mapRef" />
    </div>
    <div
      class="bottom-panel-wrapper"
      :style="{ height: `${panelHeight * 100}%` }"
    >
      <div
        class="panel-handle"
        @touchstart.prevent="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @click="togglePanel"
      >
        <div class="handle-bar"></div>
      </div>
      <BottomPanel class="panel-content" />
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  height: 100dvh;
  width: 100%;
  overflow: hidden;
}

.top-bar {
  flex-shrink: 0;
  position: relative;
  z-index: 1000;
}

.map-area {
  position: relative;
  z-index: 0;
  overflow: hidden;
  transition: height 0.25s ease-out;
}

.bottom-panel-wrapper {
  position: relative;
  z-index: 900;
  background: #fff;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  transition: height 0.25s ease-out;
}

.panel-handle {
  display: flex;
  justify-content: center;
  padding: 10px 0 6px;
  cursor: pointer;
  flex-shrink: 0;
}

.handle-bar {
  width: 36px;
  height: 5px;
  border-radius: 3px;
  background: #c8c9cc;
}

.panel-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
</style>
