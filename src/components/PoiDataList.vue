<script setup lang="ts">
// 商业 POI 目前没有真实数据来源：业务库 position_trans 中只有 entity / entity_stage，
// 没有 POI 表。这里明确显示“暂无数据源”，不用随机模拟数据冒充查询结果。
</script>

<template>
  <div class="poi-data">
    <div class="empty-state">
      <van-icon name="location-o" size="36" color="#c8c9cc" />
      <p class="title">商业 POI 数据源尚未接入</p>
      <p class="hint">
        当前业务库 position_trans 中没有 POI 数据表。待确认 POI 数据来源（内网接口或导入表）后再实现查询，本页不使用模拟数据。
      </p>
    </div>
  </div>
</template>

<style scoped>
.poi-data {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  color: var(--color-text-secondary);
  font-size: 13px;
  text-align: center;
}

.empty-state .title {
  margin: 8px 0 4px;
  font-size: 14px;
  color: #323233;
}

.empty-state .hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #969799;
}
</style>
