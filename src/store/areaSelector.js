import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 行政区划选择器 Store
 * 用于切换数据获取模式（网格模式 vs 行政区划模式）
 * 支持多选区县
 */
export const useAreaSelectorStore = defineStore('areaSelector', () => {
  // 数据获取模式：'grid' | 'area'
  const mode = ref('grid')

  // 已选中的区县列表，格式：['成都市锦江区', '成都市青羊区', ...]
  /** @type {import('vue').Ref<string[]>} */
  const selectedAreas = ref(/** @type {string[]} */ ([]))

  /** 切换模式 */
  function setMode(m) {
    mode.value = m
    // 切换到网格模式时清空区县选择
    if (m === 'grid') {
      selectedAreas.value = []
    }
  }

  /** 设置选中的区县列表 */
  function setSelectedAreas(areas) {
    selectedAreas.value = areas
  }

  /** 清空选择 */
  function clearAreas() {
    selectedAreas.value = []
  }

  return {
    mode,
    selectedAreas,
    setMode,
    setSelectedAreas,
    clearAreas
  }
})
