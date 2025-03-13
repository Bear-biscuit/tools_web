<script setup>
import {ref,} from 'vue'
import {Base64} from "js-base64";
import {ElNotification} from "element-plus";

const strData = ref()

const base64ToStr = () => {
  try {
    strData.value = Base64.decode(strData.value);
  } catch (error) {
    ElNotification({
      title: 'Error',
      message: `解码失败：${error}`,
      type: 'error',
    })
  }
}

const strToBase64 = () => {
  strData.value = Base64.encode(strData.value);
}

const bian = () => {
  if (!strData.value) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '请先填写数据',
      type: 'error',
    })
    return
  }
  strToBase64()
}

const jie = ()=> {
  if (!strData.value) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '请先填写数据',
      type: 'error',
    })
    return
  }
  base64ToStr()
}

const fuzhi = () => {
  if (!strData.value) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '请先填写数据',
      type: 'error',
    })
    return
  }
  navigator.clipboard.writeText(strData.value).then(() => {
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
    v-model="strData"
    class="w-full"
    type="textarea"
    :autosize="{ minRows: 10, maxRows: 15 }"
    placeholder="请粘贴需要转换的数据"
  />

  <div class="button">
    <el-button type="primary" @click="bian">编码</el-button>
    <el-button type="primary" @click="jie">解码</el-button>
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
