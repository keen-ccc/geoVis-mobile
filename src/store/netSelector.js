import { defineStore } from "pinia";

export const useNetSelectorStore = defineStore("netSelector", {
    state:()=>{
        return {
            selectedNet: /** @type {{name: string, address: string, lon: number, lat: number} | null} */ (null),
            range:1000,//搜索范围,单位米
            gridSize:300,//网格大小，单位米
        }
    },
    actions:{
        setSelectedNet(net){
            this.selectedNet = net
            console.log('selectedNet:',this.selectedNet)
        },
        setRange(range){
            this.range = range
        },
        setGridSize(size){
            this.gridSize = size
        }
    }

});
