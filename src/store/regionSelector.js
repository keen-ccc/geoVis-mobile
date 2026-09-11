import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 区域级联选择器 Store
 * 替代 areaSelector —— 省→市→县→网点四级级联选择
 * 用户在任意层级退出选择后，获取对应区域的数据
 *
 * 与 gridSelector 的关系：
 *   - 若网格已选中（gridSelector.num > 0），按网格边界进一步缩小范围（交集）
 *   - 若仅选区域未选网格，返回区域全部数据
 */
export const useRegionSelectorStore = defineStore('regionSelector', () => {
  /** 当前选中的省份，如 '四川省' */
  const province = ref(null)
  /** 当前选中的城市，如 '成都市' */
  const city = ref(null)
  /** 当前选中的区县，如 '锦江区' */
  const county = ref(null)
  /** 当前选中的网点，{ name, lon, lat, address } */
  const outlet = ref(null)

  /** 显示用的标签 */
  const label = computed(() => {
    const parts = []
    if (province.value) parts.push(province.value)
    if (city.value) parts.push(city.value)
    if (county.value) parts.push(county.value)
    if (outlet.value) parts.push(outlet.value.name)
    if (parts.length === 0) return '选择区域'
    const joined = parts.join(' ')
    return joined.length > 14 ? joined.slice(0, 13) + '…' : joined
  })

  /** 简短标签（用于按钮展示） */
  const shortLabel = computed(() => {
    if (outlet.value) {
      const n = outlet.value.name.replace('中国邮政集团有限公司', '')
      return n.length > 6 ? n.slice(0, 5) + '…' : n
    }
    if (county.value) return county.value
    if (city.value) return city.value
    if (province.value) return province.value
    return '选择区域'
  })

  /** 区域层级深度：0=未选, 1=省, 2=市, 3=县, 4=网点 */
  const depth = computed(() => {
    if (outlet.value) return 4
    if (county.value) return 3
    if (city.value) return 2
    if (province.value) return 1
    return 0
  })

  /** 是否有任何区域选择 */
  const hasSelection = computed(() => depth.value > 0)

  /** 设置省份 */
  function setProvince(p) {
    province.value = p
    city.value = null
    county.value = null
    outlet.value = null
  }

  /** 设置城市 */
  function setCity(c) {
    city.value = c
    county.value = null
    outlet.value = null
  }

  /** 设置区县 */
  function setCounty(c) {
    county.value = c
    outlet.value = null
  }

  /** 设置网点 */
  function setOutlet(o) {
    outlet.value = o
  }

  /** 一键设置 */
  function setSelection({ province: p, city: c, county: co, outlet: o } = {}) {
    province.value = p ?? province.value
    city.value = c ?? null
    county.value = co ?? null
    outlet.value = o ?? null
  }

  /** 全量清除 */
  function clear() {
    province.value = null
    city.value = null
    county.value = null
    outlet.value = null
  }

  /** 获取当前选中区域的完整路径字符串（用于 API 请求参数） */
  const areaPath = computed(() => {
    const parts = []
    if (province.value) parts.push(province.value)
    if (city.value) parts.push(city.value)
    if (county.value) parts.push(county.value)
    return parts.join('/')
  })

  return {
    province,
    city,
    county,
    outlet,
    label,
    shortLabel,
    depth,
    hasSelection,
    areaPath,
    setProvince,
    setCity,
    setCounty,
    setOutlet,
    setSelection,
    clear
  }
})
