<script setup lang="ts">
import { ref, inject, type Ref } from 'vue'
import { useNetSelectorStore } from '@/store/netSelector'
import { useEntityFilterStore } from '@/store/entityFilter'
import { cities } from '@/utils/getCity'

const netStore = useNetSelectorStore()
const filterStore = useEntityFilterStore()
const mapRef = inject<Ref<any>>('mapRef', ref(null))

// --- Popup visibility ---
const showCityPicker = ref(false)
const showGridControls = ref(false)
const showFilter = ref(false)
const showDataSource = ref(false)

// --- City ---
const selectedCity = ref('成都市')
const cascaderValue = ref('')
const cityCascaderOptions = cities.map(c => ({
  label: c.label,
  value: c.label,
  coords: c.coords,
  children: c.children?.map(d => ({
    label: d.label,
    value: d.label,
    coords: d.coords
  }))
}))

function onCityFinish({ selectedOptions }: { selectedOptions: Array<{ label: string; value: string; coords: number[] }> }) {
  showCityPicker.value = false
  if (selectedOptions.length === 0) return

  const last = selectedOptions[selectedOptions.length - 1]
  selectedCity.value = selectedOptions.map(o => o.label).join('')
  const [lat, lon] = last.coords
  if (mapRef?.value) {
    mapRef.value.switchCity(last.label, lat, lon)
  }
}

// --- Grid ---
const rangeKm = ref(netStore.range / 1000)
const gridSizeM = ref(netStore.gridSize)

function onRangeChange(val: number) {
  rangeKm.value = val
  netStore.setRange(Math.round(val * 1000))
}

function onGridSizeChange(val: number) {
  gridSizeM.value = val
  netStore.setGridSize(val)
}

function onClearGrid() {
  mapRef?.value?.clearGrid()
}

// --- Data source ---
const activeSource = ref<'bank' | 'express'>('bank')
const sourceOptions = [
  { text: '银行网点', value: 'bank' },
  { text: '物流网点', value: 'express' }
]

function onSelectSource({ selectedOptions }: { selectedOptions: Array<{ text: string; value: string }> }) {
  if (!selectedOptions[0]) return
  const val = selectedOptions[0].value as 'bank' | 'express'
  activeSource.value = val
  showDataSource.value = false
  mapRef?.value?.switchDataSource(val)
}

// --- Entity filter ---
const dateRange = ref<[string, string]>(['', ''])
const showStartDate = ref(false)
const showEndDate = ref(false)
const entityTypes = ref<string[]>(['企业', '个体工商户'])

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function onFilterConfirm() {
  if (dateRange.value[0] && dateRange.value[1]) {
    filterStore.setEstdateRange([dateRange.value[0], dateRange.value[1]])
  }
  filterStore.setEntityTypes(entityTypes.value)
  updateFilterSummary()
  showFilter.value = false
}

function onEntityTypeChange(val: string[]) {
  entityTypes.value = val
}

// --- Filter summary ---
const filterSummary = ref('')
function updateFilterSummary() {
  const parts: string[] = []
  if (dateRange.value[0] && dateRange.value[1]) {
    parts.push(`${dateRange.value[0]}~${dateRange.value[1]}`)
  }
  if (entityTypes.value.length > 0) {
    parts.push(entityTypes.value.join('/'))
  }
  filterSummary.value = parts.length > 0 ? parts.join(' · ') : '筛选'
}
updateFilterSummary()
</script>

<template>
  <div class="top-action-bar">
    <!-- Row 1: Main controls -->
    <div class="bar-row">
      <!-- City selector -->
      <button class="bar-btn city-btn" @click="showCityPicker = true">
        <van-icon name="location-o" size="14" />
        <span>{{ selectedCity }}</span>
        <van-icon name="arrow-down" size="10" />
      </button>

      <!-- Data source -->
      <button class="bar-btn source-btn" @click="showDataSource = true">
        {{ activeSource === 'bank' ? '银行' : '物流' }}
        <van-icon name="arrow-down" size="10" />
      </button>

      <!-- Grid info (tap to expand controls) -->
      <button class="bar-btn grid-btn" @click="showGridControls = true">
        <span>{{ rangeKm.toFixed(1) }}km</span>
        <span class="grid-divider">/</span>
        <span>{{ gridSizeM }}m</span>
      </button>

      <!-- Clear grid -->
      <button class="bar-btn clear-btn" @click="onClearGrid">清除</button>

      <!-- Filter entry -->
      <button class="bar-btn filter-btn" @click="showFilter = true">
        <van-icon name="filter-o" size="14" />
      </button>
    </div>

    <!-- City Picker Popup -->
    <van-popup v-model:show="showCityPicker" round position="bottom" :style="{ height: '60%' }" teleport="body">
      <van-cascader
        v-model="cascaderValue"
        title="选择城市"
        :options="cityCascaderOptions"
        :field-names="{ text: 'label', value: 'value', children: 'children' }"
        active-color="#1989fa"
        @finish="onCityFinish"
        @close="showCityPicker = false"
      />
    </van-popup>

    <!-- Data Source Popup -->
    <van-popup v-model:show="showDataSource" round position="bottom" teleport="body">
      <van-picker
        :columns="sourceOptions"
        :default-index="activeSource === 'bank' ? 0 : 1"
        :key="activeSource"
        @confirm="onSelectSource"
        @cancel="showDataSource = false"
        title="选择数据源"
      />
    </van-popup>

    <!-- Grid Controls Popup -->
    <van-popup v-model:show="showGridControls" round position="bottom" :style="{ padding: '24px 16px 32px' }" teleport="body">
      <div class="grid-popup">
        <h4>网格设置</h4>
        <div class="slider-group">
          <div class="slider-label">
            <span>搜索范围</span>
            <span class="slider-value">{{ rangeKm.toFixed(1) }} km</span>
          </div>
          <van-slider v-model="rangeKm" :min="1" :max="10" :step="0.2" @update:model-value="onRangeChange" />
        </div>
        <div class="slider-group">
          <div class="slider-label">
            <span>网格大小</span>
            <span class="slider-value">{{ gridSizeM }} m</span>
          </div>
          <van-slider v-model="gridSizeM" :min="200" :max="1000" :step="100" @update:model-value="onGridSizeChange" />
        </div>
        <van-button type="primary" block round @click="showGridControls = false" style="margin-top:16px">
          确认
        </van-button>
      </div>
    </van-popup>

    <!-- Filter Popup -->
    <van-popup v-model:show="showFilter" round position="bottom" :style="{ padding: '24px 16px 32px' }" teleport="body">
      <div class="filter-popup">
        <h4>数据筛选</h4>
        <!-- Date range -->
        <div class="filter-section">
          <p class="filter-title">成立日期</p>
          <div class="date-row">
            <button class="date-btn" @click="showStartDate = true">
              {{ dateRange[0] || '开始日期' }}
            </button>
            <span class="date-sep">至</span>
            <button class="date-btn" @click="showEndDate = true">
              {{ dateRange[1] || '结束日期' }}
            </button>
          </div>
        </div>
        <!-- Entity types -->
        <div class="filter-section">
          <p class="filter-title">主体类型</p>
          <van-checkbox-group v-model="entityTypes" @change="onEntityTypeChange" direction="horizontal">
            <van-checkbox name="企业" label-disabled shape="square">企业</van-checkbox>
            <van-checkbox name="个体工商户" label-disabled shape="square">个体工商户</van-checkbox>
          </van-checkbox-group>
        </div>
        <van-button type="primary" block round @click="onFilterConfirm" style="margin-top:16px">
          确认
        </van-button>
      </div>
    </van-popup>

    <!-- Start Date Picker -->
    <van-popup v-model:show="showStartDate" round position="bottom" teleport="body">
      <van-date-picker
        :min-date="new Date(2000, 0, 1)"
        :max-date="new Date()"
        @confirm="(v: { selectedValues: string[] }) => { dateRange[0] = v.selectedValues.join('-'); showStartDate = false }"
        @cancel="showStartDate = false"
        title="选择开始日期"
      />
    </van-popup>

    <!-- End Date Picker -->
    <van-popup v-model:show="showEndDate" round position="bottom" teleport="body">
      <van-date-picker
        :min-date="new Date(2000, 0, 1)"
        :max-date="new Date()"
        @confirm="(v: { selectedValues: string[] }) => { dateRange[1] = v.selectedValues.join('-'); showEndDate = false }"
        @cancel="showEndDate = false"
        title="选择结束日期"
      />
    </van-popup>
  </div>
</template>

<style scoped>
.top-action-bar {
  background: #fff;
  border-bottom: 1px solid #ebedf0;
  padding-top: env(safe-area-inset-top, 0px);
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  overflow-x: auto;
  scrollbar-width: none;
}

.bar-row::-webkit-scrollbar {
  display: none;
}

.bar-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 10px;
  border: 1px solid #ebedf0;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #323233;
  white-space: nowrap;
  min-height: 36px;
  cursor: pointer;
  flex-shrink: 0;
}

.bar-btn:active {
  background: #f7f8fa;
}

.clear-btn {
  color: #ee0a24;
  border-color: #ffcdd2;
}

.filter-btn {
  padding: 5px 8px;
}

.grid-divider {
  color: #c8c9cc;
  margin: 0 1px;
}

/* --- Popup styles --- */
.grid-popup h4,
.filter-popup h4 {
  margin: 0 0 16px;
  font-size: 16px;
}

.slider-group {
  margin-bottom: 16px;
}

.slider-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.slider-value {
  font-weight: 600;
  color: #1989fa;
}

.filter-section {
  margin-bottom: 16px;
}

.filter-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #323233;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #ebedf0;
  border-radius: 6px;
  background: #f7f8fa;
  font-size: 13px;
  color: #646566;
  text-align: center;
  min-height: 40px;
  cursor: pointer;
}

.date-sep {
  color: #c8c9cc;
  font-size: 13px;
}
</style>
