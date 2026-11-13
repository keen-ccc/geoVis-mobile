/**
 * 内网只读 API 客户端。
 * 浏览器统一请求同源相对路径 /api/...，由 Nginx（.13）转发到 Flask（.36:5000）。
 * 不使用绝对地址、不拼接 127.0.0.1，避免跨机部署时指错目标。
 */

const API_BASE = '/api'
const DEFAULT_TIMEOUT = 15000

export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, code = 'REQUEST_FAILED', status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export async function request<T>(path: string, init: RequestInit = {}, timeout = DEFAULT_TIMEOUT): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (init.body) headers['Content-Type'] = 'application/json'

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...init, headers, signal: controller.signal })
    const text = await response.text()
    let data: any = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        // 典型情况：接口缺失被 Nginx 的 history 回退返回了 index.html
        throw new ApiError('接口返回内容不是 JSON，请检查反向代理是否把 /api/ 转发到了后端', 'BAD_RESPONSE', response.status)
      }
    }
    if (!response.ok) {
      throw new ApiError(data?.message || `请求失败（HTTP ${response.status}）`, data?.error || 'HTTP_ERROR', response.status)
    }
    return data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if ((error as any)?.name === 'AbortError') throw new ApiError('请求超时，请稍后重试', 'TIMEOUT')
    throw new ApiError('无法连接内网接口服务，请确认后端服务与代理是否正常', 'NETWORK_ERROR')
  } finally {
    clearTimeout(timer)
  }
}

export interface EntitySummary {
  id: string
  name: string
  address: string | null
  entityType: string | null
  industryCode: string | null
  hyclass: string | null
  categoryName: string | null
  estdate: string | null
  registeredCapital: string | null
  capitalUnit: string
  longitude: number | null
  latitude: number | null
}

export interface EntityDetail extends EntitySummary {
  creditCode: string | null
  categoryCode: string | null
  businessscope: string | null
  regStatus: string | null
}

export interface EntitySearchPayload {
  regionPath?: string
  grids?: Array<[number, number, number, number]>
  cursor?: string
  pageSize?: number
  keyword?: string
  entityTypes?: string[]
  industryCodes?: string[]
  estdateRange?: [string, string]
  registeredCapital?: string
}

export interface EntitySearchResult {
  items: EntitySummary[]
  pageSize: number
  hasMore: boolean
  nextCursor: string | null
}

export interface FilterDictionary {
  entityTypes: string[]
  industries: Array<{ code: string; name: string }>
  sampleSize: number
}

export function searchEntities(payload: EntitySearchPayload): Promise<EntitySearchResult> {
  return request<EntitySearchResult>('/entities/search', { method: 'POST', body: JSON.stringify(payload) })
}

export function fetchEntityDetail(id: string): Promise<EntityDetail> {
  return request<EntityDetail>(`/entities/${encodeURIComponent(id)}`)
}

export function fetchApiHealth(): Promise<{ status: string; version: string }> {
  return request<{ status: string; version: string }>('/health', {}, 5000)
}

// 筛选字典只取一次，多个组件共用，避免重复扫描数据库抽样。
let dictionary: FilterDictionary | null = null
let dictionaryPromise: Promise<FilterDictionary> | null = null

export async function getFilterDictionary(): Promise<FilterDictionary> {
  if (dictionary) return dictionary
  if (!dictionaryPromise) {
    dictionaryPromise = request<FilterDictionary>('/meta/filters', {}, 20000)
      .then((data) => {
        dictionary = data
        return data
      })
      .catch((error) => {
        dictionaryPromise = null
        throw error
      })
  }
  return dictionaryPromise
}
