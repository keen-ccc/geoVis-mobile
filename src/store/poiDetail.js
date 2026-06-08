import {defineStore} from 'pinia'

export const usePoiDetailStore = defineStore('poiDetail', {
    state: () => ({
        poiIndustryData:[]
    }),
    actions: {
        setPoiData(data){
            //this.poiData = [...data]
            this.poiIndustryData = data
            // 将新的 POI 数据添加到现有数据中，而不是替换
            //this.poiData = [...this.poiData, ...newData];
        }
    }
})    