<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { useGridSelectorStore } from '@/store/gridSelector'
import { useEntityFilterStore } from '@/store/entityFilter'
import { useRegionSelectorStore } from '@/store/regionSelector'
import { useCollection, VISIT_METHOD_OPTIONS, CONTACT_METHOD_OPTIONS, FOLLOWUP_RESULT_OPTIONS } from '@/composables/useCollection'
import type { FollowUpFormData } from '@/composables/useCollection'
import { ApiError, searchEntities, fetchEntityDetail } from '@/services/api'
import type { EntityDetail, EntitySearchPayload, EntitySummary } from '@/services/api'

const gridStore = useGridSelectorStore()
const filterStore = useEntityFilterStore()
const regionStore = useRegionSelectorStore()
const { isFavorited, toggleFavorite, addFollowUp } = useCollection()

const PAGE_SIZE = 20

const entityData = ref<EntitySummary[]>([])
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const errorMessage = ref('')
const keyword = ref('')

// 请求序号：筛选快速变化时丢弃过期响应
let requestSeq = 0

const selectedGrids = computed<Array<[number, number, number, number]>>(() =>
  Array.from(gridStore.grids.values(), (grid: any) =>
    [grid.lonStart, grid.latStart, grid.lonEnd, grid.latEnd]))

const queryBlock = computed(() => {
  if (!regionStore.hasSelection && selectedGrids.value.length === 0) {
    return '请选择区域或网格查看市场主体数据'
  }
  if (selectedGrids.value.length > 50) {
    return '单次最多查询 50 个网格，请减少选择的网格数量'
  }
  if (filterStore.customerType || filterStore.postalServices.length > 0) {
    return '客户关系及邮政业务数据待接入，暂不能应用这些筛选条件'
  }
  return ''
})

function buildPayload(cursor: string | null): EntitySearchPayload {
  const payload: EntitySearchPayload = { pageSize: PAGE_SIZE }
  if (selectedGrids.value.length) payload.grids = selectedGrids.value
  if (regionStore.areaPath) payload.regionPath = regionStore.areaPath
  if (cursor) payload.cursor = cursor
  const kw = keyword.value.trim()
  if (kw) payload.keyword = kw
  if (filterStore.entityTypes.length > 0) payload.entityTypes = [...filterStore.entityTypes]
  if (filterStore.industryCodes.length > 0) payload.industryCodes = [...filterStore.industryCodes]
  const range = filterStore.estdateRange as [string, string] | null
  if (range && (range[0] || range[1])) payload.estdateRange = [range[0] || '', range[1] || '']
  if (filterStore.registeredCapital) payload.registeredCapital = filterStore.registeredCapital
  return payload
}

async function load(reset = true) {
  if (!reset && (!hasMore.value || loadingMore.value)) return
  const current = ++requestSeq
  errorMessage.value = ''
  if (queryBlock.value) {
    entityData.value = []
    nextCursor.value = null
    hasMore.value = false
    loading.value = false
    loadingMore.value = false
    return
  }
  if (reset) {
    loading.value = true
    loadingMore.value = false
  } else {
    loadingMore.value = true
  }
  try {
    const result = await searchEntities(buildPayload(reset ? null : nextCursor.value))
    if (current !== requestSeq) return
    entityData.value = reset ? result.items : [...entityData.value, ...result.items]
    nextCursor.value = result.nextCursor
    hasMore.value = result.hasMore
  } catch (error) {
    if (current !== requestSeq) return
    errorMessage.value = error instanceof ApiError ? error.message : '查询失败，请稍后重试'
    if (reset) {
      entityData.value = []
      nextCursor.value = null
      hasMore.value = false
    }
  } finally {
    if (current === requestSeq) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(true), 300)
}

// 详情
const showDetail = ref(false)
const currentItem = ref<EntitySummary | null>(null)
const detail = ref<EntityDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref('')

async function onCardClick(item: EntitySummary) {
  currentItem.value = item
  detail.value = null
  detailError.value = ''
  showDetail.value = true
  detailLoading.value = true
  try {
    detail.value = await fetchEntityDetail(item.id)
  } catch (error) {
    detailError.value = error instanceof ApiError ? error.message : '详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

// 跟进记录
const showFollowUp = ref(false)
const followUpItem = ref<EntitySummary | null>(null)
const followUpText = ref('')

const followForm = ref<FollowUpFormData>({
  visited: null,
  visitMethod: '',
  visitMethodCustom: '',
  connected: null,
  contactMethod: '',
  contactMethodCustom: '',
  result: '',
  resultCustom: '',
  customerName: '',
  customerPhone: ''
})

function resetFollowForm() {
  followUpText.value = ''
  followForm.value = {
    visited: null,
    visitMethod: '',
    visitMethodCustom: '',
    connected: null,
    contactMethod: '',
    contactMethodCustom: '',
    result: '',
    resultCustom: '',
    customerName: '',
    customerPhone: ''
  }
}

function onFollowUpClick(item: EntitySummary) {
  followUpItem.value = item
  resetFollowForm()
  showFollowUp.value = true
}

const savingFollowUp = ref(false)
async function onFollowUpSave() {
  if (!followUpItem.value) return
  if (savingFollowUp.value) return
  savingFollowUp.value = true
  const saved = await addFollowUp(
    followUpItem.value.id,
    followUpItem.value.name,
    followUpItem.value.address || '',
    followUpText.value,
    { ...followForm.value }
  )
  savingFollowUp.value = false
  if (saved) showFollowUp.value = false
}

function formatCapital(value: string | null): string {
  if (value === null || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return `${value}万`
  return `${num.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}万`
}

function locationLabel(item: { longitude: number | null; latitude: number | null }): string {
  return item.longitude !== null && item.latitude !== null ? '已定位' : '未定位'
}

watch([
  selectedGrids,
  () => regionStore.areaPath,
  () => regionStore.outlet,
  () => filterStore.entityTypes,
  () => filterStore.estdateRange,
  () => filterStore.industryCodes,
  () => filterStore.registeredCapital,
  () => filterStore.customerType,
  () => filterStore.postalServices
], () => load(true), { deep: true, immediate: true })

onBeforeUnmount(() => {
  requestSeq++
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="entity-data">
    <div class="search-bar">
      <van-search
        v-model="keyword"
        shape="round"
        placeholder="搜索主体名称或地址"
        :clearable="true"
        @update:model-value="onSearchInput"
      />
    </div>

    <div v-if="!queryBlock" class="notice-bar">
      当前按所选{{ regionStore.hasSelection ? '区域' : '' }}{{ regionStore.hasSelection && selectedGrids.length ? '与' : '' }}{{ selectedGrids.length ? '网格' : '' }}范围查询，仅包含已补充经纬度的主体
    </div>

    <div v-if="queryBlock" class="empty-state">
      <van-icon name="notes-o" size="36" color="#c8c9cc" />
      <p>{{ queryBlock }}</p>
    </div>

    <div v-else-if="loading" class="loading-state">
      <van-loading type="spinner" size="24px">加载数据中...</van-loading>
    </div>

    <div v-else-if="errorMessage" class="empty-state">
      <van-icon name="warning-o" size="36" color="#ee0a24" />
      <p>{{ errorMessage }}</p>
      <van-button size="small" type="primary" plain round @click="load(true)">重试</van-button>
    </div>

    <div v-else-if="entityData.length === 0" class="empty-state">
      <van-icon name="notes-o" size="36" color="#c8c9cc" />
      <p>所选范围内未查询到有坐标且符合筛选条件的主体，请确认主体经纬度已补充</p>
    </div>

    <div v-else class="list-container">
      <div class="list-header">
        <span class="count-text">已加载 {{ entityData.length }} 家主体{{ hasMore ? '（还有更多）' : '' }}</span>
      </div>

      <div
        v-for="item in entityData"
        :key="item.id"
        class="data-card"
        @click="onCardClick(item)"
      >
        <div class="card-title-row">
          <h4 class="card-title">{{ item.name }}</h4>
          <van-tag :type="item.longitude !== null ? 'success' : 'default'" plain>
            {{ locationLabel(item) }}
          </van-tag>
        </div>

        <div class="card-tags">
          <van-tag v-if="item.entityType" color="#f0f7ff" text-color="#1989fa">{{ item.entityType }}</van-tag>
          <van-tag v-if="item.hyclass" color="#f0f7ff" text-color="#1989fa">{{ item.hyclass }}</van-tag>
        </div>

        <p class="card-address">
          <van-icon name="location-o" /> {{ item.address || '地址未登记' }}
        </p>
        <div class="card-bottom">
          <div class="card-meta">
            <p class="card-date">成立：{{ item.estdate || '—' }}</p>
            <p class="card-capital">注册资本：{{ formatCapital(item.registeredCapital) }}</p>
          </div>
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

      <div class="load-more">
        <van-button
          v-if="hasMore"
          size="small"
          plain
          round
          :loading="loadingMore"
          @click="load(false)"
        >
          加载更多
        </van-button>
        <span v-else class="no-more">已到最后一页</span>
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
          <p><van-icon name="location-o" /> {{ followUpItem.address || '地址未登记' }}</p>
        </div>
        <div class="followup-body">
          <div class="follow-section">
            <div class="follow-label">是否走访</div>
            <van-radio-group v-model="followForm.visited" direction="horizontal" class="follow-radio">
              <van-radio :name="true">是</van-radio>
              <van-radio :name="false">否</van-radio>
            </van-radio-group>
            <div v-if="followForm.visited === true" class="follow-sub">
              <div class="follow-sub-label">走访方式</div>
              <div class="preset-tags">
                <span
                  v-for="opt in VISIT_METHOD_OPTIONS"
                  :key="opt"
                  class="preset-tag"
                  :class="{ active: followForm.visitMethod === opt }"
                  @click="followForm.visitMethod = followForm.visitMethod === opt ? '' : opt"
                >{{ opt }}</span>
              </div>
              <van-field v-model="followForm.visitMethodCustom" placeholder="自定义走访方式（选填）" class="custom-input" />
            </div>
          </div>

          <div class="follow-section">
            <div class="follow-label">是否建联</div>
            <van-radio-group v-model="followForm.connected" direction="horizontal" class="follow-radio">
              <van-radio :name="true">是</van-radio>
              <van-radio :name="false">否</van-radio>
            </van-radio-group>
            <div v-if="followForm.connected === true" class="follow-sub">
              <div class="follow-sub-label">建联方式</div>
              <div class="preset-tags">
                <span
                  v-for="opt in CONTACT_METHOD_OPTIONS"
                  :key="opt"
                  class="preset-tag"
                  :class="{ active: followForm.contactMethod === opt }"
                  @click="followForm.contactMethod = followForm.contactMethod === opt ? '' : opt"
                >{{ opt }}</span>
              </div>
              <van-field v-model="followForm.contactMethodCustom" placeholder="自定义建联方式（选填）" class="custom-input" />

              <van-field
                v-model="followForm.customerName"
                placeholder="请输入客户姓名"
                class="custom-input"
                style="margin-top:8px"
              />
              <van-field
                v-model="followForm.customerPhone"
                type="tel"
                placeholder="请输入手机号"
                class="custom-input"
              />
            </div>
          </div>

          <div class="follow-section">
            <div class="follow-label">跟进结果</div>
            <div class="preset-tags">
              <span
                v-for="opt in FOLLOWUP_RESULT_OPTIONS"
                :key="opt"
                class="preset-tag"
                :class="{ active: followForm.result === opt }"
                @click="followForm.result = followForm.result === opt ? '' : opt"
              >{{ opt }}</span>
            </div>
            <van-field v-model="followForm.resultCustom" placeholder="自定义跟进结果（选填）" class="custom-input" />
          </div>

          <div class="follow-section">
            <div class="follow-label">备注</div>
            <textarea
              v-model="followUpText"
              class="followup-textarea"
              placeholder="请输入其他备注信息..."
            ></textarea>
          </div>
        </div>
        <div class="followup-footer">
          <van-button type="primary" block round :loading="savingFollowUp" @click="onFollowUpSave">完成</van-button>
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
          <van-tag plain type="primary" v-if="currentItem.entityType">{{ currentItem.entityType }}</van-tag>
          <van-tag plain type="primary" v-if="currentItem.hyclass">{{ currentItem.hyclass }}</van-tag>
          <van-tag :type="currentItem.longitude !== null ? 'success' : 'default'">{{ locationLabel(currentItem) }}</van-tag>
        </div>

        <div class="detail-section">
          <div class="detail-item">
            <span class="label">成立日期</span>
            <span class="value">{{ currentItem.estdate || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">注册资本</span>
            <span class="value">{{ formatCapital(currentItem.registeredCapital) }}</span>
          </div>
          <div class="detail-item full-width">
            <span class="label">注册地址</span>
            <span class="value"><van-icon name="location-o" /> {{ currentItem.address || '地址未登记' }}</span>
          </div>
          <div class="detail-item full-width">
            <span class="label">统一社会信用代码</span>
            <span class="value">{{ detail?.creditCode || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">登记状态</span>
            <span class="value">{{ detail?.regStatus || '—' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">中心点坐标</span>
            <span class="value">
              {{ currentItem.longitude !== null ? `${currentItem.longitude}, ${currentItem.latitude}` : '未回填' }}
            </span>
          </div>
          <div class="detail-item full-width">
            <span class="label">经营范围</span>
            <span v-if="detailLoading" class="value desc">加载中...</span>
            <span v-else-if="detailError" class="value desc error-text">{{ detailError }}</span>
            <span v-else class="value desc">{{ detail?.businessscope || '—' }}</span>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.entity-data { height: 100%; display: flex; flex-direction: column; }
.search-bar { flex-shrink: 0; }
.notice-bar {
  flex-shrink: 0; display: flex; flex-direction: column; gap: 2px;
  padding: 6px 12px; background: #fffbe6; color: #8c6d1f; font-size: 11px; line-height: 1.4;
}
.empty-state, .loading-state {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; padding: 32px 16px;
  color: var(--color-text-secondary); font-size: 13px; text-align: center;
}
.empty-state p { margin: 0; }
.list-container { padding: 12px; }
.list-header { margin-bottom: 12px; font-size: 13px; color: var(--color-text-secondary); }
.data-card {
  background: #fff; border-radius: 4px; padding: 16px; margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04); border: 1px solid #f5f6f7; transition: all 0.2s;
}
.data-card:active { background: #f7f8fa; transform: scale(0.98); }
.card-title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 8px; }
.card-title { margin: 0; font-size: 15px; font-weight: 600; color: #323233; word-break: break-all; }
.card-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.card-address { margin: 0; font-size: 12px; color: #969799; display: flex; align-items: center; gap: 4px; }
.card-bottom { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; }
.card-meta { display: flex; flex-direction: column; gap: 2px; }
.card-date, .card-capital { margin: 0; font-size: 12px; color: #969799; display: flex; align-items: center; gap: 4px; }
.card-actions { display: flex; gap: 6px; }
.load-more { display: flex; justify-content: center; padding: 4px 0 16px; }
.no-more { font-size: 12px; color: #c8c9cc; }
.error-text { color: #ee0a24; }
/* Follow-up */
.followup-page { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: #f7f8fa; }
.followup-header { flex-shrink: 0; padding: 16px; background: #fff; border-bottom: 1px solid #ebedf0; }
.followup-header h3 { margin: 0 0 4px; font-size: 16px; color: #323233; }
.followup-header p { margin: 0; font-size: 12px; color: #969799; display: flex; align-items: center; gap: 4px; }
.followup-body { flex: 1 1 0%; padding: 12px 16px; overflow-y: auto; -webkit-overflow-scrolling: touch; touch-action: pan-y; }
.follow-section { background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
.follow-label { font-size: 15px; font-weight: 600; color: #323233; margin-bottom: 10px; }
.follow-radio { margin-bottom: 4px; }
.follow-sub { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ebedf0; }
.follow-sub-label { font-size: 13px; color: #646566; margin-bottom: 8px; }
.preset-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.preset-tag {
  display: inline-flex; align-items: center; padding: 6px 12px; border: 1px solid #ebedf0;
  border-radius: 6px; font-size: 13px; color: #646566; cursor: pointer; min-height: 34px; transition: all 0.2s;
}
.preset-tag.active { border-color: #1989fa; color: #1989fa; background: #f0f7ff; }
.custom-input { margin-top: 4px; padding: 0; }
:deep(.custom-input .van-field__control) { font-size: 13px; }
.followup-textarea {
  width: 100%; min-height: 100px; padding: 12px; border: 1px solid #ebedf0; border-radius: 8px;
  font-size: 14px; line-height: 1.6; color: #323233; resize: vertical; outline: none; font-family: inherit; box-sizing: border-box;
}
.followup-textarea:focus { border-color: #1989fa; }
.followup-footer {
  flex-shrink: 0; padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: #fff; border-top: 1px solid #ebedf0;
}
:deep(.van-popup) { display: flex; flex-direction: column; }
:deep(.van-popup__content) { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
/* Detail */
.detail-popup { padding: 24px 16px 32px; }
.detail-title { margin: 0 0 12px; font-size: 18px; font-weight: bold; color: #323233; padding-right: 24px; line-height: 1.4; }
.detail-tags { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.detail-section { display: flex; flex-wrap: wrap; gap: 16px; }
.detail-item { width: calc(50% - 8px); display: flex; flex-direction: column; gap: 4px; }
.detail-item.full-width { width: 100%; }
.detail-item .label { font-size: 12px; color: #969799; }
.detail-item .value { font-size: 14px; color: #323233; }
.detail-item .value.desc { line-height: 1.5; color: #646566; }
</style>
