import { defineStore } from 'pinia'

export const useEntityFilterStore = defineStore('entityFilter', {
  state: () => ({
    estdateRange: null,
    entityTypes: [],
    businessType: ''
  }),
  actions: {
    setEstdateRange(range) {
      this.estdateRange = range
    },
    setEntityTypes(types) {
      this.entityTypes = Array.isArray(types) ? types : []
    },
    setBusinessType(type) {
      this.businessType = type
    }
  }
})
