<script setup lang="ts">
import { useCollection } from '@/composables/useCollection'

defineEmits(['back'])
const { followUps, removeFollowUp } = useCollection()
</script>

<template>
  <div class="followups-page">
    <van-nav-bar
      title="我的跟进"
      left-text="返回"
      left-arrow
      @click-left="$emit('back')"
    />

    <div v-if="followUps.length === 0" class="empty">
      <van-icon name="records-o" size="48" color="#c8c9cc" />
      <p>暂无跟进记录</p>
    </div>

    <div v-else class="list">
      <div v-for="item in followUps" :key="item.id" class="followup-card">
        <div class="card-header">
          <h4>{{ item.entityName }}</h4>
          <van-icon
            name="delete-o"
            size="18"
            color="#ee0a24"
            @click="removeFollowUp(item.id)"
            style="cursor:pointer;flex-shrink:0"
          />
        </div>
        <p class="addr"><van-icon name="location-o" /> {{ item.entityAddress }}</p>
        <div class="followup-text">{{ item.text }}</div>
        <span class="followup-time">{{ item.time }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.followups-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c8c9cc;
  font-size: 14px;
}

.empty p { margin-top: 12px; }

.list {
  padding: 12px 16px;
}

.followup-card {
  background: #fff;
  border-radius: 2px;
  padding: 14px;
  margin-bottom: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.card-header h4 {
  margin: 0;
  font-size: 14px;
  color: #323233;
}

.addr {
  margin: 0 0 8px;
  font-size: 12px;
  color: #969799;
  display: flex;
  align-items: center;
  gap: 2px;
}

.followup-text {
  margin-bottom: 8px;
  padding: 8px 10px;
  background: #f7f8fa;
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.5;
  color: #646566;
  white-space: pre-wrap;
}

.followup-time {
  font-size: 11px;
  color: #c8c9cc;
}
</style>
