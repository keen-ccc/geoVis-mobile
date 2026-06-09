<script setup lang="ts">
import { ref, inject, type Ref } from 'vue'
import EntityDataList from './EntityDataList.vue'
import PoiDataList from './PoiDataList.vue'

const activeTab = ref(0)
const mapRef = inject<Ref<any>>('mapRef', ref(null))

// --- Search ---
const searchText = ref('')
const searchResults = ref<any[]>([])
const showResults = ref(false)
let allDots: Array<{ name: string; lon: number; lat: number; type: string; address: string }> = []

async function loadSearchData() {
  if (allDots.length > 0) return
  try {
    const [bankRes, expressRes] = await Promise.all([
      fetch('/data/YZ-bank.json'),
      fetch('/data/YZ-express.json')
    ])
    const banks = await bankRes.json()
    const expresses = await expressRes.json()

    allDots = [
      ...banks.map((d: any) => ({
        name: d.orgName || d.erpName || '',
        lon: d.lon, lat: d.lat,
        type: '银行', address: d.address || ''
      })),
      ...expresses.map((d: any) => ({
        name: d.name || '',
        lon: d.lon, lat: d.lat,
        type: '物流', address: d.address || ''
      }))
    ]
  } catch (e) { /* ignore */ }
}

function onSearch(val: string) {
  searchText.value = val
  if (!val.trim()) {
    searchResults.value = []
    showResults.value = false
    return
  }
  if (allDots.length === 0) {
    loadSearchData().then(() => doSearch(val))
  } else {
    doSearch(val)
  }
}

function doSearch(keyword: string) {
  const kw = keyword.toLowerCase()
  searchResults.value = allDots
    .filter(d => d.name.toLowerCase().includes(kw))
    .slice(0, 20)
  showResults.value = searchResults.value.length > 0
}

function onSelectResult(dot: any) {
  showResults.value = false
  searchText.value = dot.name
  if (mapRef?.value) {
    mapRef.value.locateDotByCoord(dot.lat, dot.lon)
  }
}

function onSearchFocus() {
  loadSearchData()
  if (searchText.value.trim()) {
    showResults.value = searchResults.value.length > 0
  }
}

function onSearchBlur() {
  // Delay to allow click on result
  setTimeout(() => { showResults.value = false }, 200)
}
</script>

<template>
  <div class="bottom-panel">
    <!-- Search bar -->
    <div class="search-area">
      <van-search
        v-model="searchText"
        shape="round"
        placeholder="搜索网点名称"
        @update:model-value="onSearch"
        @focus="onSearchFocus"
        @blur="onSearchBlur"
      />
      <!-- Results dropdown -->
      <div v-if="showResults" class="search-results">
        <div
          v-for="dot in searchResults"
          :key="`${dot.lon}_${dot.lat}`"
          class="search-item"
          @mousedown.prevent
          @click="onSelectResult(dot)"
        >
          <div class="result-name">{{ dot.name }}</div>
          <div class="result-meta">
            <van-tag :type="dot.type === '银行' ? 'primary' : 'warning'" size="mini">
              {{ dot.type }}
            </van-tag>
            <span class="result-addr">{{ dot.address }}</span>
          </div>
        </div>
      </div>
    </div>

    <van-tabs v-model:active="activeTab">
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
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-area {
  flex-shrink: 0;
  position: relative;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  background: #fff;
  border-top: 1px solid #ebedf0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 10;
}

.search-item {
  padding: 10px 16px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
}

.search-item:active {
  background: #f7f8fa;
}

.result-name {
  font-size: 14px;
  color: #323233;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.result-addr {
  font-size: 12px;
  color: #969799;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

:deep(.van-tabs) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

:deep(.van-tabs__content) {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
</style>
