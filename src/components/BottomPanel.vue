<script setup lang="ts">
import { ref } from 'vue'
import EntityDataList from './EntityDataList.vue'
import PoiDataList from './PoiDataList.vue'

const activeTab = ref(0)
</script>

<template>
  <div class="bottom-panel">
    <div class="panel-handle">
      <div class="handle-bar"></div>
    </div>

    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="市场主体">
        <EntityDataList />
      </van-tab>
      <van-tab title="商业POI">
        <PoiDataList />
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped>
.bottom-panel {
  background: #fff;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  max-height: 45vh;
  display: flex;
  flex-direction: column;
}

.panel-handle {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
}

.handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #dcdee0;
}
</style>
