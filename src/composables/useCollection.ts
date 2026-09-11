import { ref, watch } from 'vue'

export interface FavoriteItem {
  id: number
  name: string
  address: string
  hyclass: string
  entityType: string
  addedAt: string
}

// 跟进记录预设选项
export const VISIT_METHOD_OPTIONS = ['上门走访', '电话走访', '微信联系', '其他']
export const CONTACT_METHOD_OPTIONS = ['电话', '微信', '邮件', '线下会面', '其他']
export const FOLLOWUP_RESULT_OPTIONS = ['有意向合作', '暂不考虑', '需要进一步跟进', '已达成合作', '其他']

export interface FollowUpRecord {
  id: number
  entityId: number
  entityName: string
  entityAddress: string
  text: string           // 兼容旧版：自由文本
  time: string

  // 结构化跟进字段
  visited: boolean | null       // 是否走访
  visitMethod: string           // 走访方式（预设或自定义）
  visitMethodCustom: string     // 走访方式自定义输入

  connected: boolean | null     // 是否建联
  contactMethod: string         // 建联方式
  contactMethodCustom: string   // 建联方式自定义输入

  result: string                // 跟进结果
  resultCustom: string          // 跟进结果自定义输入

  customerName: string          // 客户姓名
  customerPhone: string         // 客户联系方式
}

export interface FollowUpFormData {
  visited: boolean | null
  visitMethod: string
  visitMethodCustom: string
  connected: boolean | null
  contactMethod: string
  contactMethodCustom: string
  result: string
  resultCustom: string
  customerName: string
  customerPhone: string
}

const FAVORITES_KEY = 'geovis_favorites'
const FOLLOWUPS_KEY = 'geovis_followups'

// --- Load from localStorage ---
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

const favorites = ref<FavoriteItem[]>(loadJSON(FAVORITES_KEY, []))
const followUps = ref<FollowUpRecord[]>(loadJSON(FOLLOWUPS_KEY, []))

// --- Persist ---
watch(favorites, (v) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(v)), { deep: true })
watch(followUps, (v) => localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(v)), { deep: true })

// --- Favorites ---
function isFavorited(entityId: number): boolean {
  return favorites.value.some(f => f.id === entityId)
}

function toggleFavorite(item: { id: number; name: string; address: string; hyclass: string; entityType: string }) {
  const idx = favorites.value.findIndex(f => f.id === item.id)
  if (idx > -1) {
    favorites.value.splice(idx, 1)
  } else {
    favorites.value.push({
      id: item.id,
      name: item.name,
      address: item.address,
      hyclass: item.hyclass,
      entityType: item.entityType,
      addedAt: new Date().toLocaleString('zh-CN')
    })
  }
}

// --- FollowUps ---
/**
 * 添加跟进记录（新版结构化数据）
 */
function addFollowUp(
  entityId: number,
  entityName: string,
  entityAddress: string,
  text: string,
  formData?: Partial<FollowUpFormData>
) {
  const now = new Date().toLocaleString('zh-CN')
  followUps.value.unshift({
    id: Date.now(),
    entityId,
    entityName,
    entityAddress,
    text: text.trim(),
    time: now,
    visited: formData?.visited ?? null,
    visitMethod: formData?.visitMethod ?? '',
    visitMethodCustom: formData?.visitMethodCustom ?? '',
    connected: formData?.connected ?? null,
    contactMethod: formData?.contactMethod ?? '',
    contactMethodCustom: formData?.contactMethodCustom ?? '',
    result: formData?.result ?? '',
    resultCustom: formData?.resultCustom ?? '',
    customerName: formData?.customerName ?? '',
    customerPhone: formData?.customerPhone ?? ''
  })
}

function removeFollowUp(id: number) {
  const idx = followUps.value.findIndex(f => f.id === id)
  if (idx > -1) followUps.value.splice(idx, 1)
}

// --- 导出为 CSV ---
function exportFollowUpsToCSV(): string {
  const headers = [
    '主体名称', '地址', '跟进时间',
    '是否走访', '走访方式', '走访方式(自定义)',
    '是否建联', '建联方式', '建联方式(自定义)',
    '跟进结果', '跟进结果(自定义)',
    '客户姓名', '联系方式', '备注'
  ]

  const rows = followUps.value.map(r => [
    r.entityName,
    r.entityAddress,
    r.time,
    r.visited === null ? '' : (r.visited ? '是' : '否'),
    r.visitMethod,
    r.visitMethodCustom,
    r.connected === null ? '' : (r.connected ? '是' : '否'),
    r.contactMethod,
    r.contactMethodCustom,
    r.result,
    r.resultCustom,
    r.customerName,
    r.customerPhone,
    r.text
  ])

  const escape = (v: string) => {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const bom = '\uFEFF' // BOM for Excel UTF-8 compatibility
  return bom + [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
}

function downloadFollowUpsCSV() {
  const csv = exportFollowUpsToCSV()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `跟进记录_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function useCollection() {
  return {
    favorites,
    followUps,
    isFavorited,
    toggleFavorite,
    addFollowUp,
    removeFollowUp,
    exportFollowUpsToCSV,
    downloadFollowUpsCSV
  }
}
