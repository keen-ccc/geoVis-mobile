import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { request } from '@/services/api'

export interface FavoriteItem {
  // 数据库主键为 BIGINT UNSIGNED，前端统一用字符串，避免精度丢失
  id: string
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
  id: string
  entityId: string
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

const favorites = ref<FavoriteItem[]>([])
const followUps = ref<FollowUpRecord[]>([])
const collectionError = ref('')
const collectionLoading = ref(false)
let refreshing: Promise<void> | null = null
const pendingFavorites = new Set<string>()
const pendingFollowUps = new Set<string>()
const retryTokens = new Map<string, string>()

async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = []
  let cursor = ''
  do {
    const result = await request<{ items: T[]; hasMore: boolean; nextCursor: string | null }>(
      `${path}?pageSize=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)
    items.push(...result.items)
    cursor = result.hasMore && result.nextCursor ? result.nextCursor : ''
  } while (cursor)
  return items
}

function refreshCollections(): Promise<void> {
  if (refreshing) return refreshing
  collectionLoading.value = true
  refreshing = Promise.all([allPages<FavoriteItem>('/favorites'), allPages<FollowUpRecord>('/followups')])
    .then(([savedFavorites, savedFollowUps]) => {
      favorites.value = savedFavorites
      followUps.value = savedFollowUps
      collectionError.value = ''
    })
    .catch((error: Error) => {
      collectionError.value = error.message || '记录加载失败，请重试'
      throw error
    })
    .finally(() => { refreshing = null; collectionLoading.value = false })
  return refreshing
}

// --- Favorites ---
function isFavorited(entityId: string): boolean {
  return favorites.value.some(f => f.id === entityId)
}

async function toggleFavorite(item: { id: string; name: string; address: string | null; hyclass: string | null; entityType: string | null }) {
  if (pendingFavorites.has(item.id)) return
  pendingFavorites.add(item.id)
  try {
    await refreshCollections()
    const removing = isFavorited(item.id)
    await request(`/favorites/${encodeURIComponent(item.id)}`, { method: removing ? 'DELETE' : 'PUT' })
    await refreshCollections()
    showToast(removing ? '已取消共享收藏' : '已加入共享收藏')
  } catch (error) {
    showToast((error as Error).message || '收藏保存失败，请重试')
  } finally {
    pendingFavorites.delete(item.id)
  }
}

// --- FollowUps ---
/**
 * 添加跟进记录（新版结构化数据）
 */
async function addFollowUp(
  entityId: string,
  entityName: string,
  entityAddress: string,
  text: string,
  formData?: Partial<FollowUpFormData>
) : Promise<boolean> {
  const form = {
    text: text.trim(),
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
  }
  // Retain the same request ID after a timeout so a retry cannot insert twice.
  const fingerprint = JSON.stringify([entityId, form])
  if (pendingFollowUps.has(fingerprint)) return false
  pendingFollowUps.add(fingerprint)
  try {
    let token = retryTokens.get(fingerprint)
    if (!token) {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      token = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
      retryTokens.set(fingerprint, token)
    }
    const saved = await request<FollowUpRecord>('/followups', {
      method: 'POST', body: JSON.stringify({ entityId, requestId: token, form })
    })
    followUps.value = [saved, ...followUps.value.filter(row => row.id !== saved.id)]
    retryTokens.delete(fingerprint)
    showToast('跟进记录已保存到数据库')
    return true
  } catch (error) {
    showToast((error as Error).message || '保存失败，请重试')
    return false
  } finally {
    pendingFollowUps.delete(fingerprint)
  }
}

async function removeFollowUp(id: string) {
  try {
    await request(`/followups/${encodeURIComponent(id)}`, { method: 'DELETE' })
    followUps.value = followUps.value.filter(row => row.id !== id)
  } catch (error) {
    showToast((error as Error).message || '删除失败，请重试')
  }
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
    let s = String(v ?? '')
    if (/^[\s]*[=+@-]/.test(s)) s = `'${s}`
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
  onMounted(() => { refreshCollections().catch(() => {}) })
  return {
    collectionError,
    collectionLoading,
    refreshCollections,
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
