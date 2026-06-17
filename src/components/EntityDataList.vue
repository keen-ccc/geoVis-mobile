<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGridSelectorStore } from '@/store/gridSelector'
import { useEntityFilterStore } from '@/store/entityFilter'
import { useCollection } from '@/composables/useCollection'

const gridStore = useGridSelectorStore()
const filterStore = useEntityFilterStore()
const { isFavorited, toggleFavorite, addFollowUp } = useCollection()

interface EntityItem {
  id: number
  name: string
  address: string
  businessscope: string
  hyclass: string
  entityType: string
  estdate: string
  isCustomer: boolean
}

const entityData = ref<EntityItem[]>([])
const loading = ref(false)

// 详情弹窗
const showDetail = ref(false)
const currentItem = ref<EntityItem | null>(null)

// 跟进记录
const showFollowUp = ref(false)
const followUpItem = ref<EntityItem | null>(null)
const followUpText = ref('')

// 模拟生成数据
const mockDataGenerator = (count: number): EntityItem[] => {
  const hyClasses = ['科学研究和技术服务业', '批发和零售业', '住宿和餐饮业', '制造业', '建筑业']
  
  // 结合顶部全局的过滤器选项
  const typeOptions = filterStore.entityTypes && filterStore.entityTypes.length > 0
    ? filterStore.entityTypes
    : ['企业', '个体工商户']
  
  const [startD, endD] = filterStore.estdateRange || ['', '']
  const startY = startD ? parseInt(startD.substring(0, 4)) : 2020
  const endY = endD ? parseInt(endD.substring(0, 4)) : 2023

  return Array.from({ length: count }, (_, i) => {
    const isCust = Math.random() > 0.5
    const y = Math.floor(Math.random() * (endY - startY + 1)) + startY
    const m = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
    const d = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')

    return {
      id: i + 1 + gridStore.num * 1000,
      name: `测试经营主体名称${i + 1}`,
      address: `成都市某某区某某街道${i + 1}号`,
      businessscope: '一般项目：技术服务、技术开发、技术咨询、技术交流、技术转让、技术推广；计算机软硬件及辅助设备零售；电子产品销售。（除依法须经批准的项目外，凭营业执照依法自主开展经营活动）',
      hyclass: hyClasses[Math.floor(Math.random() * hyClasses.length)],
      entityType: typeOptions[Math.floor(Math.random() * typeOptions.length)],
      estdate: `${y}-${m}-${d}`,
      isCustomer: isCust
    }
  })
}

const fetchData = () => {
  if (gridStore.num === 0) {
    entityData.value = []
    return
  }
  loading.value = true
  setTimeout(() => {
    entityData.value = mockDataGenerator(Math.floor(Math.random() * 10) + 5)
    loading.value = false
  }, 400)
}

// 监听网格变化以及全局过滤器的变化
watch([() => gridStore.num, () => filterStore.entityTypes, () => filterStore.estdateRange], fetchData, { immediate: true, deep: true })

function onCardClick(item: EntityItem) {
  currentItem.value = item
  showDetail.value = true
}

function onFollowUpClick(item: EntityItem) {
  followUpItem.value = item
  followUpText.value = ''
  showFollowUp.value = true
}

function onFollowUpSave() {
  if (!followUpText.value.trim() || !followUpItem.value) return
  addFollowUp(followUpItem.value.id, followUpItem.value.name, followUpItem.value.address, followUpText.value)
  showFollowUp.value = false
}
</script>

<template>
  <div class="entity-data">
    <div v-if="gridStore.num === 0" class="empty-state">
      <van-icon name="notes-o" size="36" color="#c8c9cc" />
      <p>请在网格中选择区域查看市场主体数据</p>
    </div>
    
    <div v-else-if="loading" class="loading-state">
      <van-loading type="spinner" size="24px">加载数据中...</van-loading>
    </div>

    <div v-else class="list-container">
      <div class="list-header">
        <span class="count-text">共找到 {{ entityData.length }} 家主体</span>
      </div>
      
      <div
        v-for="item in entityData"
        :key="item.id"
        class="data-card"
        @click="onCardClick(item)"
      >
        <div class="card-title-row">
          <h4 class="card-title">{{ item.name }}</h4>
          <van-tag :type="item.isCustomer ? 'success' : 'primary'" plain>
            {{ item.isCustomer ? '已合作客户' : '潜在客户' }}
          </van-tag>
        </div>

        <div class="card-tags">
          <van-tag type="primary" color="#f0f7ff" text-color="#1989fa">{{ item.entityType }}</van-tag>
          <van-tag type="primary" color="#f0f7ff" text-color="#1989fa">{{ item.hyclass }}</van-tag>
        </div>

        <p class="card-address">
          <van-icon name="location-o" /> {{ item.address }}
        </p>
        <div class="card-bottom">
          <p class="card-date">成立日期：{{ item.estdate }}</p>
          <div class="card-actions">
            <van-button
              :type="isFavorited(item.id) ? 'warning' : 'default'"
              :icon="isFavorited(item.id) ? 'star' : 'star-o'"
              size="small"
              round
              @click.stop="toggleFavorite(item)"
            />
            <van-button
              type="primary"
              size="small"
              round
              @click.stop="onFollowUpClick(item)"
            >
              跟进
            </van-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 跟进记录页 -->
    <van-popup
      v-model:show="showFollowUp"
      position="right"
      :style="{ width: '100%', height: '100%' }"
      teleport="body"
    >
      <div v-if="followUpItem" class="followup-page">
        <van-nav-bar
          title="跟进记录"
          left-text="返回"
          left-arrow
          @click-left="showFollowUp = false"
        />
        <div class="followup-header">
          <h3>{{ followUpItem.name }}</h3>
          <p><van-icon name="location-o" /> {{ followUpItem.address }}</p>
        </div>
        <div class="followup-body">
          <textarea
            v-model="followUpText"
            class="followup-textarea"
            placeholder="请输入跟进结果、拜访记录等内容..."
          ></textarea>
        </div>
        <div class="followup-footer">
          <van-button type="primary" block round @click="onFollowUpSave">完成</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 详情弹窗 -->
    <van-popup
      v-model:show="showDetail"
      round
      position="bottom"
      :style="{ height: '65%' }"
      closeable
    >
      <div v-if="currentItem" class="detail-popup">
        <h3 class="detail-title">{{ currentItem.name }}</h3>
        
        <div class="detail-tags">
          <van-tag :type="currentItem.isCustomer ? 'success' : 'default'">
            {{ currentItem.isCustomer ? '合作客户' : '潜在客户' }}
          </van-tag>
          <van-tag plain type="primary">{{ currentItem.entityType }}</van-tag>
          <van-tag plain type="primary">{{ currentItem.hyclass }}</van-tag>
        </div>

        <div class="detail-section">
          <div class="detail-item full-width">
            <span class="label">成立日期</span>
            <span class="value">{{ currentItem.estdate }}</span>
          </div>
          <div class="detail-item full-width">
            <span class="label">注册地址</span>
            <span class="value"><van-icon name="location-o" /> {{ currentItem.address }}</span>
          </div>
          <div class="detail-item full-width">
            <span class="label">经营范围</span>
            <span class="value desc">{{ currentItem.businessscope }}</span>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.entity-data {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.empty-state, .loading-state {
  flex: 1;
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

.list-container {
  padding: 12px;
}

.list-header {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.data-card {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  border: 1px solid #f5f6f7;
  transition: all 0.2s;
}

.data-card:active {
  background: #f7f8fa;
  transform: scale(0.98);
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 8px;
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  word-break: break-all;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.card-address, .card-date {
  margin: 0;
  font-size: 12px;
  color: #969799;
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.card-actions {
  display: flex;
  gap: 6px;
}

/* Follow-up page */
.followup-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f7f8fa;
}

.followup-header {
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #ebedf0;
}

.followup-header h3 {
  margin: 0 0 4px;
  font-size: 16px;
  color: #323233;
}

.followup-header p {
  margin: 0;
  font-size: 12px;
  color: #969799;
  display: flex;
  align-items: center;
  gap: 4px;
}

.followup-body {
  flex: 1;
  padding: 12px 16px;
}

.followup-textarea {
  width: 100%;
  height: 100%;
  min-height: 200px;
  padding: 12px;
  border: 1px solid #ebedf0;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #323233;
  resize: none;
  outline: none;
  font-family: inherit;
}

.followup-textarea:focus {
  border-color: #1989fa;
}

.followup-footer {
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border-top: 1px solid #ebedf0;
}

/* Detail Popup */
.detail-popup {
  padding: 24px 16px 32px;
}

.detail-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: bold;
  color: #323233;
  padding-right: 24px;
  line-height: 1.4;
}

.detail-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.detail-section {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.detail-item {
  width: calc(50% - 8px);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  width: 100%;
}

.detail-item .label {
  font-size: 12px;
  color: #969799;
}

.detail-item .value {
  font-size: 14px;
  color: #323233;
}

.detail-item .value.desc {
  line-height: 1.5;
  color: #646566;
}
</style>
