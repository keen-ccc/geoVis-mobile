import { defineStore } from 'pinia'

export const useEntityFilterStore = defineStore('entityFilter', {
  state: () => ({
    estdateRange: null,
    entityTypes: []
  }),
  actions: {
    setEstdateRange(range) {
      this.estdateRange = range
    },
    setEntityTypes(types) {
      this.entityTypes = Array.isArray(types) ? types : []
    }
  }
})
