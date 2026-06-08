<script setup lang="ts">
// TODO: POI data list with cards, tap to drill down
</script>

<template>
  <div class="poi-data">
    <div class="empty-state">
      <van-icon name="location-o" size="36" color="#c8c9cc" />
      <p>请在网格中选择区域查看商业POI数据</p>
    </div>
  </div>
</template>

<style scoped>
.poi-data {
  padding: 16px;
  min-height: 120px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: var(--color-text-secondary);
  font-size: 13px;
  text-align: center;
}

.empty-state p {
  margin-top: 8px;
}
</style>
