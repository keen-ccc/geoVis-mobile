<script setup lang="ts">
import { ref, inject, type Ref, computed, onMounted } from 'vue'
import { useNetSelectorStore } from '@/store/netSelector'
import { useEntityFilterStore } from '@/store/entityFilter'
import { useRegionSelectorStore } from '@/store/regionSelector'
import { useGridSelectorStore } from '@/store/gridSelector'
import { cities } from '@/utils/getCity'

const netStore = useNetSelectorStore()
const filterStore = useEntityFilterStore()
const regionStore = useRegionSelectorStore()
const gridStore = useGridSelectorStore()
const mapRef = inject<Ref<any>>('mapRef', ref(null))

// --- Popup visibility ---
const showRegionPicker = ref(false)
const showGridControls = ref(false)
const showFilter = ref(false)
const showDataSource = ref(false)

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

// --- Region cascading picker ---
// Province level — hardcoded for Sichuan area (all cities are Sichuan cities)
const provinces = [
  { label: '四川省', value: '四川省' }
]

// City level — from getCity.js
interface CascadeOption {
  label: string
  value: string
  coords: number[]
  children?: CascadeOption[]
}

const cityOptions: CascadeOption[] = cities.map(c => ({
  label: c.label,
  value: c.label,
  coords: c.coords,
  children: c.children?.map(d => ({
    label: d.label,
    value: d.label,
    coords: d.coords
  }))
}))

// Cascading state: which level is active
const cascadeLevel = ref<'province' | 'city' | 'county'>('province')
const selectedProvince = ref('')
const selectedCityName = ref('')
const selectedCityCoords = ref<number[]>([0, 0])
const selectedCounty = ref('')
const selectedCountyCoords = ref<number[]>([0, 0])

// Computed options for current level
const currentOptions = computed(() => {
  if (cascadeLevel.value === 'province') return provinces
  if (cascadeLevel.value === 'city') return cityOptions as any[]
  if (cascadeLevel.value === 'county') {
    const city = cityOptions.find(c => c.label === selectedCityName.value)
    return city?.children || []
  }
  return []
})

// Breadcrumb navigation — 支持点击跳转
const breadcrumbs = computed(() => {
  const crumbs: Array<{ label: string; level: 'province' | 'city' | 'county' }> = []
  if (selectedProvince.value) crumbs.push({ label: selectedProvince.value, level: 'city' })
  if (selectedCityName.value) crumbs.push({ label: selectedCityName.value, level: 'county' })
  if (selectedCounty.value) crumbs.push({ label: selectedCounty.value, level: 'county' })
  return crumbs
})

function jumpToLevel(level: string) {
  if (level === 'city') {
    cascadeLevel.value = 'city'
  } else if (level === 'county') {
    cascadeLevel.value = 'county'
  }
}

function onCascadeItemClick(item: any) {
  if (cascadeLevel.value === 'province') {
    selectedProvince.value = item.label
    cascadeLevel.value = 'city'
  } else if (cascadeLevel.value === 'city') {
    selectedCityName.value = item.label
    selectedCityCoords.value = item.coords
    cascadeLevel.value = 'county'
  } else if (cascadeLevel.value === 'county') {
    // 选中区县，立即确认
    selectedCounty.value = item.label
    selectedCountyCoords.value = item.coords
    confirmRegion()
    return
  }
}

function goBackLevel() {
  if (cascadeLevel.value === 'city') {
    cascadeLevel.value = 'province'
    selectedProvince.value = ''
  } else if (cascadeLevel.value === 'county') {
    cascadeLevel.value = 'city'
    selectedCityName.value = ''
  }
}

function confirmRegion() {
  showRegionPicker.value = false

  // Determine effective selection level
  let effectiveLevel = cascadeLevel.value
  // 在区县级列表但未选区县 → 退回到市级确认
  if (effectiveLevel === 'county' && !selectedCounty.value) {
    effectiveLevel = 'city'
  }

  // Update regionStore
  if (effectiveLevel === 'county' && selectedCounty.value) {
    regionStore.setSelection({
      province: selectedProvince.value,
      city: selectedCityName.value,
      county: selectedCounty.value
    })
  } else if (effectiveLevel === 'city' && selectedCityName.value) {
    regionStore.setCity(selectedCityName.value)
    regionStore.province = selectedProvince.value
  } else if (effectiveLevel === 'province' && selectedProvince.value) {
    regionStore.setProvince(selectedProvince.value)
  }

  // Fly map
  if (effectiveLevel === 'county' && selectedCountyCoords.value[0]) {
    const [lat, lon] = selectedCountyCoords.value
    mapRef?.value?.switchCity?.(selectedCounty.value, lat, lon)
  } else if (effectiveLevel === 'city' && selectedCityCoords.value[0]) {
    const [lat, lon] = selectedCityCoords.value
    mapRef?.value?.switchCity?.(selectedCityName.value, lat, lon)
  } else if (effectiveLevel === 'province') {
    mapRef?.value?.switchCity?.('四川省', 30.5728, 104.0668)
  }

  resetCascade()
}

function resetCascade() {
  cascadeLevel.value = 'province'
  selectedProvince.value = ''
  selectedCityName.value = ''
  selectedCityCoords.value = [0, 0]
  selectedCounty.value = ''
  selectedCountyCoords.value = [0, 0]
}

function openRegionPicker() {
  // Sync with current store state
  if (regionStore.province) {
    selectedProvince.value = regionStore.province
    cascadeLevel.value = 'city'
    if (regionStore.city) {
      selectedCityName.value = regionStore.city
      const city = cityOptions.find(c => c.label === regionStore.city)
      if (city) selectedCityCoords.value = city.coords
      cascadeLevel.value = 'county'
      if (regionStore.county) {
        selectedCounty.value = regionStore.county
      }
    }
  }
  showRegionPicker.value = true
}

// --- Grid controls ---
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
  regionStore.clear()
}

// --- Entity filter (expanded) ---
const dateRange = ref<[string, string]>(['', ''])
const showStartDate = ref(false)
const showEndDate = ref(false)
const entityTypes = ref<string[]>([...filterStore.entityTypes])
const industryCodes = ref<string[]>([...filterStore.industryCodes])
const customerType = ref<string>(filterStore.customerType)
const postalServices = ref<string[]>([...filterStore.postalServices])
const regCapital = ref<string>(filterStore.registeredCapital)

// Industry options — common national standard categories
const industryOptions = [
  '农、林、牧、渔业', '采矿业', '制造业',
  '电力、热力、燃气及水生产和供应业', '建筑业',
  '批发和零售业', '交通运输、仓储和邮政业',
  '住宿和餐饮业', '信息传输、软件和信息技术服务业',
  '金融业', '房地产业', '租赁和商务服务业',
  '科学研究和技术服务业', '水利、环境和公共设施管理业',
  '居民服务、修理和其他服务业', '教育',
  '卫生和社会工作', '文化、体育和娱乐业'
]

const capitalOptions = [
  { label: '不限', value: '' },
  { label: '<10万', value: '<10w' },
  { label: '10-100万', value: '10-100w' },
  { label: '100-500万', value: '100-500w' },
  { label: '500-1000万', value: '500-1000w' },
  { label: '>1000万', value: '>1000w' }
]

function toggleIndustry(code: string) {
  const idx = industryCodes.value.indexOf(code)
  if (idx > -1) industryCodes.value.splice(idx, 1)
  else industryCodes.value.push(code)
}

function onFilterConfirm() {
  if (dateRange.value[0] && dateRange.value[1]) {
    filterStore.setEstdateRange([dateRange.value[0], dateRange.value[1]])
  } else {
    filterStore.setEstdateRange(null)
  }
  filterStore.setEntityTypes(entityTypes.value)
  filterStore.setIndustryCodes(industryCodes.value)
  filterStore.setCustomerType(customerType.value)
  filterStore.setPostalServices(postalServices.value)
  filterStore.setRegisteredCapital(regCapital.value)
  showFilter.value = false
}

function onFilterReset() {
  dateRange.value = ['', '']
  entityTypes.value = []
  industryCodes.value = []
  customerType.value = ''
  postalServices.value = []
  regCapital.value = ''
}

// Grid count display
const gridCount = computed(() => gridStore.num)
</script>

<template>
  <div class="top-action-bar">
    <!-- Row 1: Main controls -->
    <div class="bar-row">
      <!-- Region selector (replaces city + mode) -->
      <button class="bar-btn region-btn" @click="openRegionPicker">
        <van-icon name="location-o" size="14" />
        <span class="region-label">{{ regionStore.shortLabel }}</span>
        <van-icon name="arrow-down" size="10" />
      </button>

      <!-- Data source -->
      <button class="bar-btn source-btn" @click="showDataSource = true">
        {{ activeSource === 'bank' ? '银行' : '物流' }}
        <van-icon name="arrow-down" size="10" />
      </button>

      <!-- Grid info & controls -->
      <button class="bar-btn grid-btn" @click="showGridControls = true">
        <span>{{ rangeKm.toFixed(1) }}km</span>
        <span class="grid-divider">/</span>
        <span>{{ gridSizeM }}m</span>
        <span v-if="gridCount > 0" class="grid-count">{{ gridCount }}</span>
      </button>

      <!-- Clear -->
      <button class="bar-btn clear-btn" @click="onClearGrid">清除</button>

      <!-- Filter entry -->
      <button class="bar-btn filter-btn" @click="showFilter = true">
        <van-icon name="filter-o" size="14" />
        <span v-if="filterStore.hasActiveFilters" class="filter-dot"></span>
      </button>
    </div>

    <!-- === Region Cascading Picker Popup === -->
    <van-popup v-model:show="showRegionPicker" round position="bottom" :style="{ height: '70%' }" teleport="body">
      <div class="region-picker-popup">
        <div class="region-picker-header">
          <van-icon
            v-if="cascadeLevel !== 'province'"
            name="arrow-left"
            size="20"
            @click="goBackLevel"
            class="back-icon"
          />
          <div class="breadcrumb">
            <span v-for="(crumb, idx) in breadcrumbs" :key="idx" class="crumb">
              <span v-if="idx > 0" class="crumb-sep">›</span>
              <span
                :class="{ active: idx === breadcrumbs.length - 1, clickable: idx < breadcrumbs.length - 1 }"
                @click="idx < breadcrumbs.length - 1 && jumpToLevel(crumb.level)"
              >{{ crumb.label }}</span>
            </span>
          </div>
          <span class="confirm-text" @click="confirmRegion">确定</span>
        </div>
        <div class="region-picker-body">
          <div
            v-for="item in currentOptions"
            :key="item.value"
            class="region-item"
            @click="onCascadeItemClick(item)"
          >
            <span>{{ item.label }}</span>
            <van-icon name="arrow" size="14" color="#c8c9cc" />
          </div>
        </div>
      </div>
    </van-popup>

    <!-- === Data Source Popup === -->
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

    <!-- === Grid Controls Popup === -->
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

    <!-- === Filter Popup (comprehensive) === -->
    <van-popup v-model:show="showFilter" round position="bottom" :style="{ height: '85%' }" teleport="body">
      <div class="filter-popup-full">
        <div class="filter-header">
          <span class="filter-header-title">数据筛选</span>
          <span class="filter-reset" @click="onFilterReset">重置</span>
        </div>
        <div class="filter-body">
          <!-- 成立日期 -->
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

          <!-- 主体类型 -->
          <div class="filter-section">
            <p class="filter-title">主体类型</p>
            <van-checkbox-group v-model="entityTypes" direction="horizontal">
              <van-checkbox name="企业" shape="square">企业</van-checkbox>
              <van-checkbox name="个体工商户" shape="square">个体工商户</van-checkbox>
              <van-checkbox name="农民专业合作社" shape="square">农民专业合作社</van-checkbox>
            </van-checkbox-group>
          </div>

          <!-- 行业 -->
          <div class="filter-section">
            <p class="filter-title">
              行业
              <span class="filter-count" v-if="industryCodes.length > 0">已选{{ industryCodes.length }}</span>
            </p>
            <div class="tag-grid">
              <span
                v-for="ind in industryOptions"
                :key="ind"
                class="filter-tag"
                :class="{ active: industryCodes.includes(ind) }"
                @click="toggleIndustry(ind)"
              >{{ ind }}</span>
            </div>
          </div>

          <!-- 客户类型 -->
          <div class="filter-section">
            <p class="filter-title">客户类型</p>
            <van-radio-group v-model="customerType" direction="horizontal">
              <van-radio name="">全部</van-radio>
              <van-radio name="postal">邮政客户</van-radio>
              <van-radio name="non-postal">非邮政客户</van-radio>
            </van-radio-group>
          </div>

          <!-- 邮政业务 -->
          <div class="filter-section">
            <p class="filter-title">邮政业务</p>
            <div class="tag-grid">
              <span
                v-for="svc in ['定期', '理财', '基金', '保险', '信用卡']"
                :key="svc"
                class="filter-tag"
                :class="{ active: postalServices.includes(svc) }"
                @click="() => {
                  const idx = postalServices.indexOf(svc)
                  if (idx > -1) postalServices.splice(idx, 1)
                  else postalServices.push(svc)
                }"
              >{{ svc }}</span>
            </div>
          </div>

          <!-- 注册资本 -->
          <div class="filter-section">
            <p class="filter-title">注册资本</p>
            <div class="tag-grid">
              <span
                v-for="cap in capitalOptions"
                :key="cap.value"
                class="filter-tag"
                :class="{ active: regCapital === cap.value }"
                @click="regCapital = cap.value"
              >{{ cap.label }}</span>
            </div>
          </div>
        </div>
        <div class="filter-footer">
          <van-button type="primary" block round @click="onFilterConfirm">确认</van-button>
        </div>
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

.bar-row::-webkit-scrollbar { display: none; }

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

.bar-btn:active { background: #f7f8fa; }

.region-btn {
  max-width: 130px;
  border-color: #1989fa;
  color: #1989fa;
  background: #f0f7ff;
}

.region-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80px;
  font-weight: 600;
}

.grid-btn {
  position: relative;
}

.grid-count {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e41a1c;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.clear-btn {
  color: #ee0a24;
  border-color: #ffcdd2;
}

.filter-btn {
  padding: 5px 8px;
  position: relative;
}

.filter-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ee0a24;
}

.grid-divider {
  color: #c8c9cc;
  margin: 0 1px;
}

/* --- Region cascading picker --- */
.region-picker-popup {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.region-picker-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #ebedf0;
  flex-shrink: 0;
}

.back-icon {
  cursor: pointer;
  color: #1989fa;
  flex-shrink: 0;
}

.breadcrumb {
  flex: 1;
  font-size: 13px;
  color: #969799;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crumb-sep {
  margin: 0 4px;
  color: #c8c9cc;
}

.crumb .active {
  color: #1989fa;
  font-weight: 600;
}

.crumb .clickable {
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.confirm-text {
  font-size: 14px;
  color: #1989fa;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.region-picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.region-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  font-size: 15px;
  color: #323233;
  cursor: pointer;
  border-bottom: 1px solid #f5f6f7;
  min-height: 44px;
}

.region-item:active { background: #f7f8fa; }

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
}

.empty-outlets {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: #c8c9cc;
}

.empty-outlets p { margin-top: 8px; font-size: 13px; }

/* --- Popup styles --- */
.grid-popup h4 {
  margin: 0 0 16px;
  font-size: 16px;
}

.slider-group { margin-bottom: 16px; }

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

.filter-section { margin-bottom: 16px; }

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

.date-sep { color: #c8c9cc; font-size: 13px; }

/* --- Comprehensive filter popup --- */
.filter-popup-full {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebedf0;
  flex-shrink: 0;
}

.filter-header-title {
  font-size: 16px;
  font-weight: 700;
  color: #323233;
}

.filter-reset {
  font-size: 14px;
  color: #1989fa;
  cursor: pointer;
}

.filter-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
}

.filter-count {
  font-size: 12px;
  color: #1989fa;
  font-weight: 400;
  margin-left: 8px;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border: 1px solid #ebedf0;
  border-radius: 6px;
  font-size: 13px;
  color: #646566;
  cursor: pointer;
  min-height: 34px;
  transition: all 0.2s;
}

.filter-tag:active {
  transform: scale(0.96);
}

.filter-tag.active {
  border-color: #1989fa;
  color: #1989fa;
  background: #f0f7ff;
}

.filter-footer {
  flex-shrink: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid #ebedf0;
}
</style>
