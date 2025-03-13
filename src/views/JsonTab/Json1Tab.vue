<script setup>
import {ref,} from 'vue'

const jsonData = ref()

const meihua = () => {
  if (!jsonData.value) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '请先填写数据',
      type: 'error',
    })
    return
  }
  try {
    jsonData.value = JSON.stringify(JSON.parse(jsonData.value), null, 2)
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: 'JSON解析错误',
      type: 'error',
    })
  }

}

const fuzhi = () => {
  if (!jsonData.value) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '请先填写数据',
      type: 'error',
    })
    return
  }
  navigator.clipboard.writeText(jsonData.value).then(() => {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Success',
      message: '复制成功',
      type: 'success',
    })
  }).catch(() => {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '复制失败,请尝试手动复制',
      type: 'error',
    })
  })

}

</script>
<template>
  <el-input
    v-model="jsonData"
    class="w-full"
    type="textarea"
    :autosize="{ minRows: 10, maxRows: 15 }"
    placeholder="请粘贴需要美化的json数据"
  />

  <div class="button">
    <el-button type="primary" @click="meihua">美化</el-button>
    <el-button type="success" @click="fuzhi">复制</el-button>
  </div>

</template>
<style scoped>
.button {
  display: flex;
  justify-content: end;
  margin-top: 10px;
}
</style>
