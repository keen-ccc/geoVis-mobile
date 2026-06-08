<script setup lang="ts">
import { ref, onMounted } from 'vue'

const mapContainer = ref<HTMLDivElement | null>(null)
let mapInstance: any = null

function initMap() {
  // TODO: init Leaflet map + D3 scatter layer + D3 grid layer
  console.log('Map container ready:', mapContainer.value)
}

defineExpose({ mapInstance })

onMounted(() => {
  initMap()
})
</script>

<template>
  <div ref="mapContainer" class="mobile-map">
    <div class="map-placeholder">
      <van-icon name="map-marked" size="48" color="#c8c9cc" />
      <p>地图加载中...</p>
    </div>
  </div>
</template>

<style scoped>
.mobile-map {
  width: 100%;
  height: 100%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-placeholder {
  text-align: center;
  color: #c8c9cc;
}

.map-placeholder p {
  margin-top: 12px;
  font-size: 14px;
}
</style>
