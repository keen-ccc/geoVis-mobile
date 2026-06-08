import { defineStore } from "pinia";

export const useNetSelectorStore = defineStore("netSelector", {
    state:()=>{
        return {
            selectedNet:null,//选中的邮政网点，{name,address,lon,lat}
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
