<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGridSelectorStore } from '@/store/gridSelector'

const gridStore = useGridSelectorStore()

interface PoiItem {
  id: number
  name: string
  address: string
  hyclass: string
  isCustomer: boolean
}

const poiData = ref<PoiItem[]>([])
const loading = ref(false)

// 详情弹窗
const showDetail = ref(false)
const currentItem = ref<PoiItem | null>(null)

// 行业筛选
const activeIndustry = ref('银行')
const industryOptions = [
  { text: '银行', value: '银行' },
  { text: '物流', value: '物流' },
  { text: '餐饮', value: '餐饮' },
  { text: '企业', value: '企业' },
  { text: '购物', value: '购物' }
]

// 模拟生成数据
const mockPoiGenerator = (count: number, type: string): PoiItem[] => {
  return Array.from({ length: count }, (_, i) => {
    const isCust = Math.random() > 0.7
    return {
      id: i + Date.now(),
      name: `测试${type}名称${i + 1}`,
      address: `成都市某某区某某路${Math.floor(Math.random() * 100)}号`,
      hyclass: type,
      isCustomer: isCust
    }
  })
}

const fetchData = () => {
  if (gridStore.num === 0) {
    poiData.value = []
    return
  }
  loading.value = true
  setTimeout(() => {
    poiData.value = mockPoiGenerator(Math.floor(Math.random() * 8) + 3, activeIndustry.value)
    loading.value = false
  }, 300)
}

watch([() => gridStore.num, activeIndustry], fetchData, { immediate: true })

const onCardClick = (item: PoiItem) => {
  currentItem.value = item
  showDetail.value = true
}
</script>

<template>
  <div class="poi-data">
    <!-- 筛选栏 -->
    <div class="filter-bar" v-if="gridStore.num > 0">
      <van-dropdown-menu active-color="#1989fa">
        <van-dropdown-item v-model="activeIndustry" :options="industryOptions" />
      </van-dropdown-menu>
    </div>

    <div v-if="gridStore.num === 0" class="empty-state">
      <van-icon name="location-o" size="36" color="#c8c9cc" />
      <p>请在网格中选择区域查看商业POI数据</p>
    </div>
    
    <div v-else-if="loading" class="loading-state">
      <van-loading type="spinner" size="24px">加载数据中...</van-loading>
    </div>

    <div v-else class="list-container">
      <div class="list-header">
        <span class="count-text">共找到 {{ poiData.length }} 个{{ activeIndustry }}POI</span>
      </div>
      
      <div 
        v-for="item in poiData" 
        :key="item.id" 
        class="data-card"
        @click="onCardClick(item)"
      >
        <div class="card-title-row">
          <h4 class="card-title">
            <span class="dot-icon" :class="item.isCustomer ? 'cust' : ''"></span>
            {{ item.name }}
          </h4>
        </div>
        
        <div class="card-tags">
          <van-tag plain :type="item.isCustomer ? 'success' : 'primary'">
            {{ item.isCustomer ? '已覆盖客户' : '非合作' }}
          </van-tag>
          <van-tag color="#f0f7ff" text-color="#1989fa">{{ item.hyclass }}</van-tag>
        </div>

        <p class="card-address">
          <van-icon name="location-o" /> {{ item.address }}
        </p>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <van-popup
      v-model:show="showDetail"
      round
      position="bottom"
      :style="{ height: '40%' }"
      closeable
    >
      <div v-if="currentItem" class="detail-popup">
        <h3 class="detail-title">{{ currentItem.name }}</h3>
        
        <div class="detail-tags">
          <van-tag :type="currentItem.isCustomer ? 'success' : 'primary'">
            {{ currentItem.isCustomer ? '已网络覆盖' : '暂未覆盖' }}
          </van-tag>
          <van-tag plain type="primary">{{ currentItem.hyclass }}</van-tag>
        </div>

        <div class="detail-section">
          <div class="detail-item full-width">
            <span class="label">地址</span>
            <span class="value"><van-icon name="location-o" /> {{ currentItem.address }}</span>
          </div>
          <div class="detail-item">
            <span class="label">行业类型</span>
            <span class="value">{{ currentItem.hyclass }}</span>
          </div>
        </div>
        
        <!-- <div class="action-bar">
          <van-button type="primary" block round>导航到此处</van-button>
        </div> -->
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.poi-data {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filter-bar {
  flex-shrink: 0;
  border-bottom: 1px solid #f5f6f7;
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
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #c8c9cc;
  flex-shrink: 0;
}

.dot-icon.cust {
  background-color: #07c160;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.card-address {
  margin: 0;
  font-size: 12px;
  color: #969799;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Detail Popup */
.detail-popup {
  padding: 24px 16px 32px;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
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
  flex: 1;
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

.action-bar {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f5f6f7;
}
</style>
