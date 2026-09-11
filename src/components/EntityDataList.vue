<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useGridSelectorStore } from '@/store/gridSelector'
import { useEntityFilterStore } from '@/store/entityFilter'
import { useRegionSelectorStore } from '@/store/regionSelector'
import { useCollection, VISIT_METHOD_OPTIONS, CONTACT_METHOD_OPTIONS, FOLLOWUP_RESULT_OPTIONS } from '@/composables/useCollection'
import type { FollowUpFormData } from '@/composables/useCollection'
import { maskName, maskPhone } from '@/utils/mask'

const gridStore = useGridSelectorStore()
const filterStore = useEntityFilterStore()
const regionStore = useRegionSelectorStore()
const { isFavorited, toggleFavorite, addFollowUp } = useCollection()

const hasSelection = computed(() => {
  return regionStore.hasSelection || gridStore.num > 0
})

const emptyMessage = computed(() => '请选择区域或网格查看市场主体数据')

interface EntityItem {
  id: number
  name: string
  address: string
  businessscope: string
  hyclass: string
  entityType: string
  estdate: string
  isCustomer: boolean
  businessTypes: string[]
  registeredCapital: number
  contactPerson: string
  contactPhone: string
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

// 结构化跟进表单
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

// 模拟生成数据
const businessPool = ['定期', '理财', '基金', '保险', '信用卡']
const hyClassPool = [
  '农、林、牧、渔业', '采矿业', '制造业',
  '电力、热力、燃气及水生产和供应业', '建筑业',
  '批发和零售业', '交通运输、仓储和邮政业',
  '住宿和餐饮业', '信息传输、软件和信息技术服务业',
  '金融业', '房地产业', '租赁和商务服务业',
  '科学研究和技术服务业', '水利、环境和公共设施管理业',
  '居民服务、修理和其他服务业', '教育',
  '卫生和社会工作', '文化、体育和娱乐业'
]
const surnames = ['张', '王', '李', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '胡', '朱', '郭', '何', '林', '罗', '高']
const nameChars = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '洋', '勇', '艳', '杰', '军', '涛', '明', '超', '华', '平', '刚']
const capitals = [5, 15, 50, 200, 800, 2000]

function generatePhone(): string {
  const prefixes = ['138', '139', '136', '158', '159', '188', '177', '186']
  return prefixes[Math.floor(Math.random() * prefixes.length)] + String(Math.floor(10000000 + Math.random() * 90000000))
}

function generateName(): string {
  return surnames[Math.floor(Math.random() * surnames.length)] + nameChars[Math.floor(Math.random() * nameChars.length)]
}

function formatCapital(c: number): string {
  if (c >= 10000) return (c / 10000).toFixed(0) + '万'
  return c + '万'
}

const mockDataGenerator = (count: number): EntityItem[] => {
  const typeOptions = filterStore.entityTypes && filterStore.entityTypes.length > 0
    ? filterStore.entityTypes
    : ['企业', '个体工商户', '农民专业合作社']

  const hyOptions = filterStore.industryCodes && filterStore.industryCodes.length > 0
    ? filterStore.industryCodes
    : hyClassPool

  const [startD, endD] = filterStore.estdateRange || ['', '']
  const startY = startD ? parseInt(startD.substring(0, 4)) : 2020
  const endY = endD ? parseInt(endD.substring(0, 4)) : 2023

  const custType = filterStore.customerType
  const postalServicesFilter = filterStore.postalServices
  const capitalFilter = filterStore.registeredCapital

  // 根据注册资本筛选，确定可选范围
  const capitalMap: Record<string, number[]> = {
    '<10w': [5],
    '10-100w': [15, 50],
    '100-500w': [200],
    '500-1000w': [800],
    '>1000w': [2000]
  }
  const validCapitals = capitalFilter ? (capitalMap[capitalFilter] || capitals) : capitals

  const areaLabel = regionStore.hasSelection
    ? regionStore.areaPath || '成都市'
    : '成都市'

  return Array.from({ length: count }, (_, i) => {
    let isCust = Math.random() > 0.5
    if (custType === 'postal') isCust = true
    if (custType === 'non-postal') isCust = false

    const y = Math.floor(Math.random() * (endY - startY + 1)) + startY
    const m = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
    const d = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')
    const area = areaLabel

    let businessTypes: string[]
    if (isCust) {
      if (postalServicesFilter.length > 0) {
        const hasFiltered = postalServicesFilter.filter(() => Math.random() > 0.3)
        businessTypes = hasFiltered.length > 0 ? hasFiltered : [postalServicesFilter[0]]
      } else {
        businessTypes = businessPool.filter(() => Math.random() > 0.5).slice(0, Math.floor(Math.random() * 3) + 1)
      }
    } else {
      businessTypes = []
    }

    return {
      id: i + 1 + gridStore.num * 1000 + regionStore.depth * 5000,
      name: `测试经营主体名称${i + 1}`,
      address: `${area}某某街道${i + 1}号`,
      businessscope: '一般项目：技术服务、技术开发、技术咨询、技术交流、技术转让、技术推广；计算机软硬件及辅助设备零售；电子产品销售。（除依法须经批准的项目外，凭营业执照依法自主开展经营活动）',
      hyclass: hyOptions[Math.floor(Math.random() * hyOptions.length)],
      entityType: typeOptions[Math.floor(Math.random() * typeOptions.length)],
      estdate: `${y}-${m}-${d}`,
      isCustomer: isCust,
      businessTypes,
      registeredCapital: validCapitals[Math.floor(Math.random() * validCapitals.length)],
      contactPerson: generateName(),
      contactPhone: generatePhone()
    }
  })
}

const fetchData = () => {
  if (!hasSelection.value) {
    entityData.value = []
    return
  }
  loading.value = true
  setTimeout(() => {
    const allData = mockDataGenerator(Math.floor(Math.random() * 10) + 5)
    entityData.value = allData
    loading.value = false
  }, 400)
}

watch([
  () => gridStore.num,
  () => regionStore.hasSelection,
  () => regionStore.areaPath,
  () => filterStore.entityTypes,
  () => filterStore.estdateRange,
  () => filterStore.industryCodes,
  () => filterStore.customerType,
  () => filterStore.postalServices,
  () => filterStore.registeredCapital
], fetchData, { immediate: true, deep: true })

function onCardClick(item: EntityItem) {
  currentItem.value = item
  showDetail.value = true
}

function onFollowUpClick(item: EntityItem) {
  followUpItem.value = item
  resetFollowForm()
  showFollowUp.value = true
}

function onFollowUpSave() {
  if (!followUpItem.value) return
  addFollowUp(
    followUpItem.value.id,
    followUpItem.value.name,
    followUpItem.value.address,
    followUpText.value,
    { ...followForm.value }
  )
  showFollowUp.value = false
}
</script>

<template>
  <div class="entity-data">
    <div v-if="!hasSelection" class="empty-state">
      <van-icon name="notes-o" size="36" color="#c8c9cc" />
      <p>{{ emptyMessage }}</p>
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
            {{ item.isCustomer ? '邮政客户' : '非邮政客户' }}
          </van-tag>
        </div>

        <div class="card-tags">
          <van-tag color="#f0f7ff" text-color="#1989fa">{{ item.entityType }}</van-tag>
          <van-tag color="#f0f7ff" text-color="#1989fa">{{ item.hyclass }}</van-tag>
          <template v-if="item.isCustomer && item.businessTypes.length > 0">
            <van-tag
              v-for="bt in item.businessTypes"
              :key="bt"
              color="#fff7e6"
              text-color="#fa8c16"
            >{{ bt }}</van-tag>
          </template>
        </div>

        <p class="card-address">
          <van-icon name="location-o" /> {{ item.address }}
        </p>
        <div class="card-bottom">
          <div class="card-meta">
            <p class="card-date">成立：{{ item.estdate }}</p>
            <p class="card-capital">注册资金：{{ formatCapital(item.registeredCapital) }}</p>
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
          <!-- 是否走访 -->
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

          <!-- 是否建联 -->
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

              <!-- 客户姓名 -->
              <van-field
                v-model="followForm.customerName"
                placeholder="请输入客户姓名"
                class="custom-input"
                style="margin-top:8px"
              />
              <!-- 联系方式 -->
              <van-field
                v-model="followForm.customerPhone"
                type="tel"
                placeholder="请输入手机号"
                class="custom-input"
              />
            </div>
          </div>

          <!-- 跟进结果 -->
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

          <!-- 备注 -->
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
            {{ currentItem.isCustomer ? '邮政客户' : '非邮政客户' }}
          </van-tag>
          <van-tag plain type="primary">{{ currentItem.entityType }}</van-tag>
          <van-tag plain type="primary">{{ currentItem.hyclass }}</van-tag>
          <template v-if="currentItem.isCustomer && currentItem.businessTypes.length > 0">
            <van-tag
              v-for="bt in currentItem.businessTypes"
              :key="bt"
              type="warning"
            >{{ bt }}</van-tag>
          </template>
        </div>

        <div class="detail-section">
          <div class="detail-item">
            <span class="label">成立日期</span>
            <span class="value">{{ currentItem.estdate }}</span>
          </div>
          <div class="detail-item">
            <span class="label">注册资本</span>
            <span class="value">{{ formatCapital(currentItem.registeredCapital) }}</span>
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
.entity-data { height: 100%; display: flex; flex-direction: column; }
.filter-bar { flex-shrink: 0; border-bottom: 1px solid #f5f6f7; }
.empty-state, .loading-state {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 32px 16px;
  color: var(--color-text-secondary); font-size: 13px; text-align: center;
}
.empty-state p { margin-top: 8px; }
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
