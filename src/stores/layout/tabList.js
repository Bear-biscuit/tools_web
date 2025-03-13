import {defineStore} from 'pinia'
import {ref,computed} from 'vue'

export const useTabListStore = defineStore('tabList', () => {
    const list = ref([
      {
        title: 'json 美化',
        name: 'json1'
      }
    ])

  const getList = computed(() => {
    return list.value
  })
    const chakan = (name) => {
      return list.value.some(item => item.name === name);  // 返回 true 或 false
    }

    const addTab = (tab) => {
      list.value.push(tab)
    }

    const removeTab = (tagName)=>{
      list.value = list.value.filter(item => item.name !== tagName)
    }
    return {
      getList,
      list,
      addTab,
      chakan,
      removeTab
    }
  },
  {
    persist: {
      pick: ['list']
    }
  })
