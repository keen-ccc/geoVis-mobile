import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 经营主体数据筛选 Store
 * 扩展条件：注册时间、主体类型、行业、客户类型、加办邮政业务、注册资本
 */
export const useEntityFilterStore = defineStore('entityFilter', () => {
  // --- 成立日期范围 ---
  const estdateRange = ref(null)

  // --- 主体类型：企业、个体工商户、农民专业合作社 ---
  const entityTypes = ref([])

  // --- 行业分类（国家标准，多选）--- 
  const industryCodes = ref([])

  // --- 客户类型：''=全部, 'postal'=邮政客户, 'non-postal'=非邮政客户 ---
  const customerType = ref('')

  // --- 加办邮政业务（仅邮政客户有效）：定期、理财、基金、保险、信用卡 ---
  const postalServices = ref([])

  // --- 注册资本区间：''=全部, '<10w', '10-100w', '100-500w', '500-1000w', '>1000w' ---
  const registeredCapital = ref('')

  // --- 是否设置了任何筛选 ---
  const hasActiveFilters = computed(() => {
    return (
      estdateRange.value !== null ||
      entityTypes.value.length > 0 ||
      industryCodes.value.length > 0 ||
      customerType.value !== '' ||
      postalServices.value.length > 0 ||
      registeredCapital.value !== ''
    )
  })

  // --- 筛选摘要（简短文本用于按钮显示） ---
  const filterSummary = computed(() => {
    const parts = []
    if (estdateRange.value) {
      parts.push(`${estdateRange.value[0]}~${estdateRange.value[1]}`)
    }
    if (entityTypes.value.length > 0 && entityTypes.value.length < 3) {
      parts.push(entityTypes.value.join('/'))
    }
    if (industryCodes.value.length > 0) {
      parts.push(`行业(${industryCodes.value.length})`)
    }
    if (customerType.value === 'postal') parts.push('邮政客户')
    if (customerType.value === 'non-postal') parts.push('非邮政客户')
    if (postalServices.value.length > 0) {
      parts.push(`业务(${postalServices.value.length})`)
    }
    if (registeredCapital.value) {
      const labels = {
        '<10w': '<10万', '10-100w': '10-100万', '100-500w': '100-500万',
        '500-1000w': '500-1000万', '>1000w': '>1000万'
      }
      parts.push(labels[registeredCapital.value] || registeredCapital.value)
    }
    return parts.length > 0 ? parts.join(' · ') : '筛选'
  })

  // --- actions ---
  function setEstdateRange(range) {
    estdateRange.value = range
  }
  function setEntityTypes(types) {
    entityTypes.value = Array.isArray(types) ? types : []
  }
  function setIndustryCodes(codes) {
    industryCodes.value = Array.isArray(codes) ? codes : []
  }
  function setCustomerType(type) {
    customerType.value = type
    // 切换到非邮政客户时清空邮政业务筛选
    if (type !== 'postal') {
      postalServices.value = []
    }
  }
  function setPostalServices(services) {
    postalServices.value = Array.isArray(services) ? services : []
  }
  function setRegisteredCapital(capital) {
    registeredCapital.value = capital
  }
  function clearAll() {
    estdateRange.value = null
    entityTypes.value = []
    industryCodes.value = []
    customerType.value = ''
    postalServices.value = []
    registeredCapital.value = ''
  }

  return {
    estdateRange,
    entityTypes,
    industryCodes,
    customerType,
    postalServices,
    registeredCapital,
    hasActiveFilters,
    filterSummary,
    setEstdateRange,
    setEntityTypes,
    setIndustryCodes,
    setCustomerType,
    setPostalServices,
    setRegisteredCapital,
    clearAll
  }
})
