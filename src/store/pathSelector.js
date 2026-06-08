import { defineStore } from 'pinia'

export const pathGridStore = defineStore('pathSelector',{
    state:()=> {
      return {
        pathID : -1
      }
    },
    actions:{
      selectPath(id){
        this.pathID = id 
      },
      cancelPath() {
        this.pathID = -1
      }
    }
  })