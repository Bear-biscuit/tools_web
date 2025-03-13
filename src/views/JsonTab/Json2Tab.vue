<script setup>
import { ref,watch } from 'vue'
const jsonData = ref()
const jsonDataValue = ref()

const isArray = ref(false)
const isDouble= ref(false)
const isSort = ref(false)

watch(jsonData, (newVal) => {
  try {
    jsonDataValue.value = JSON.parse(newVal)
  } catch (e) {
    console.log(e)
    console.log('JSON解析错误')
    jsonDataValue.value = null
  }
})
</script>
<template>
  <el-input
    v-model="jsonData"
    class="w-full"
    type="textarea"
    :autosize="{ minRows: 10, maxRows: 15 }"
    placeholder="请粘贴需要处理的json数据"
  />

  <el-row :gutter="20"  style="margin-top: 10px; margin-bottom: 10px">
    <el-col :span="8" class="text-center">
      数组索引:
      <el-switch
      v-model="isArray"
      inline-prompt
      active-text="是"
      inactive-text="否"
    />
    </el-col>
    <el-col :span="8" class="text-center">
      key双引号:
        <el-switch
          v-model="isDouble"
          inline-prompt
          active-text="是"
          inactive-text="否"
        />
    </el-col>
    <el-col :span="8" class="text-center">
      key值排序:
        <el-switch
          v-model="isSort"
          inline-prompt
          active-text="是"
          inactive-text="否"
        />
    </el-col>
  </el-row>

  <json-viewer
    :value="jsonDataValue"
    :expand-depth=2
    copyable
    :show-double-quotes="isDouble"
    :show-array-index="isArray"
    :sort="isSort"></json-viewer>
</template>
