<script setup lang="ts">
import { ref } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { maskName, maskPhone } from '@/utils/mask'

defineEmits(['back'])
const { followUps, removeFollowUp, downloadFollowUpsCSV } = useCollection()

// 展开/折叠状态管理
const expandedIds = ref<Set<number>>(new Set())

function toggleExpand(id: number) {
  const s = new Set(expandedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedIds.value = s
}

function isExpanded(id: number): boolean {
  return expandedIds.value.has(id)
}

function formatVisitInfo(record: any): string {
  if (record.visited === null || record.visited === undefined) return '-'
  if (!record.visited) return '否'
  let method = record.visitMethod || ''
  if (method === '其他' && record.visitMethodCustom) method = record.visitMethodCustom
  else if (record.visitMethodCustom) method += ` (${record.visitMethodCustom})`
  return method ? `是 · ${method}` : '是'
}

function formatContactInfo(record: any): string {
  if (record.connected === null || record.connected === undefined) return '-'
  if (!record.connected) return '否'
  let method = record.contactMethod || ''
  if (method === '其他' && record.contactMethodCustom) method = record.contactMethodCustom
  else if (record.contactMethodCustom) method += ` (${record.contactMethodCustom})`
  return method ? `是 · ${method}` : '是'
}

function formatResult(record: any): string {
  let r = record.result || ''
  if (r === '其他' && record.resultCustom) r = record.resultCustom
  else if (record.resultCustom) r += ` (${record.resultCustom})`
  return r || '-'
}

function formatCustomerName(record: any): string {
  return record.customerName ? maskName(record.customerName) : '-'
}

function formatCustomerPhone(record: any): string {
  return record.customerPhone ? maskPhone(record.customerPhone) : '-'
}

/** 生成展开前显示的简短摘要 */
function getSummary(record: any): string {
  const parts: string[] = []
  if (record.visited !== null && record.visited !== undefined) {
    parts.push(record.visited ? '已走访' : '未走访')
  }
  if (record.connected !== null && record.connected !== undefined) {
    parts.push(record.connected ? '已建联' : '未建联')
  }
  if (record.result) {
    let r = record.result
    if (r === '其他' && record.resultCustom) r = record.resultCustom
    parts.push(r)
  }
  return parts.length > 0 ? parts.join(' · ') : '点击查看详情'
}
</script>

<template>
  <div class="followups-page">
    <van-nav-bar
      title="我的跟进"
      left-text="返回"
      left-arrow
      @click-left="$emit('back')"
    >
      <template #right>
        <van-button
          v-if="followUps.length > 0"
          type="primary"
          size="small"
          @click="downloadFollowUpsCSV"
        >
          导出CSV
        </van-button>
      </template>
    </van-nav-bar>

    <div v-if="followUps.length === 0" class="empty">
      <van-icon name="records-o" size="48" color="#c8c9cc" />
      <p>暂无跟进记录</p>
    </div>

    <div v-else class="list">
      <div
        v-for="item in followUps"
        :key="item.id"
        class="followup-card"
        @click="toggleExpand(item.id)"
      >
        <div class="card-header">
          <h4>{{ item.entityName }}</h4>
          <van-icon
            name="delete-o"
            size="18"
            color="#ee0a24"
            @click.stop="removeFollowUp(item.id)"
            style="cursor:pointer;flex-shrink:0"
          />
        </div>
        <p class="addr"><van-icon name="location-o" /> {{ item.entityAddress }}</p>

        <!-- 折叠时的摘要 -->
        <p class="summary">{{ getSummary(item) }}</p>
        <div class="summary-row">
          <span class="followup-time">{{ item.time }}</span>
          <van-icon
            :name="isExpanded(item.id) ? 'arrow-up' : 'arrow-down'"
            size="14"
            color="#c8c9cc"
          />
        </div>

        <!-- 展开后的详细内容 -->
        <div v-if="isExpanded(item.id)" class="followup-detail">
          <div class="follow-table">
            <div class="follow-row">
              <span class="follow-th">是否走访</span>
              <span class="follow-td">{{ formatVisitInfo(item) }}</span>
            </div>
            <div class="follow-row">
              <span class="follow-th">是否建联</span>
              <span class="follow-td">{{ formatContactInfo(item) }}</span>
            </div>
            <div class="follow-row">
              <span class="follow-th">跟进结果</span>
              <span class="follow-td">{{ formatResult(item) }}</span>
            </div>
            <div class="follow-row" v-if="item.customerName || item.customerPhone">
              <span class="follow-th">客户姓名</span>
              <span class="follow-td">{{ formatCustomerName(item) }}</span>
            </div>
            <div class="follow-row" v-if="item.customerPhone">
              <span class="follow-th">联系方式</span>
              <span class="follow-td">{{ formatCustomerPhone(item) }}</span>
            </div>
          </div>
          <div v-if="item.text" class="followup-text">{{ item.text }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.followups-page {
  flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: #f7f8fa;
}
.empty {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; color: #c8c9cc; font-size: 14px;
}
.empty p { margin-top: 12px; }
.list {
  flex: 1; padding: 12px 16px; overflow-y: auto;
  -webkit-overflow-scrolling: touch; touch-action: pan-y;
}
.followup-card {
  background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 10px; cursor: pointer;
}
.followup-card:active { background: #f7f8fa; }
.card-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;
}
.card-header h4 { margin: 0; font-size: 14px; color: #323233; }
.addr {
  margin: 0 0 6px; font-size: 12px; color: #969799; display: flex; align-items: center; gap: 2px;
}
.summary {
  margin: 0 0 2px; font-size: 12px; color: #646566;
}
.summary-row {
  display: flex; justify-content: space-between; align-items: center;
}
.followup-time { font-size: 11px; color: #c8c9cc; }
.followup-detail {
  margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ebedf0;
}
.follow-table {
  width: 100%; border: 1px solid #ebedf0; border-radius: 6px; overflow: hidden; margin-bottom: 8px;
}
.follow-row { display: flex; border-bottom: 1px solid #f5f6f7; }
.follow-row:last-child { border-bottom: none; }
.follow-th {
  width: 80px; flex-shrink: 0; padding: 8px 10px; font-size: 12px;
  color: #969799; background: #fafafa; border-right: 1px solid #f5f6f7;
}
.follow-td { flex: 1; padding: 8px 10px; font-size: 13px; color: #323233; }
.followup-text {
  margin-bottom: 4px; padding: 8px 10px; background: #f7f8fa; border-radius: 2px;
  font-size: 13px; line-height: 1.5; color: #646566; white-space: pre-wrap;
}
</style>
