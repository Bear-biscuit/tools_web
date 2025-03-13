<script setup>
import {ref,} from 'vue'
import {decode, encode} from "hi-base32";

const inputText = ref('')


const base32ToStr = () => {

  try {
    // 解码并直接转换为字符串（库支持选项参数）
    const result = decode(input, {asString: true});
    inputText.value = result;
  } catch (error) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: error.message,
      type: 'error',
    })
  }
}

const strToBase32 = () => {
  try {
    const data = new TextEncoder().encode(inputText.value);
    inputText.value = encode(data)
  } catch (error) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: error.message,
      type: 'error',
    })
  }
}


const bian = () => {
  if (!inputText.value) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '请先填写数据',
      type: 'error',
    })
    return
  }
  strToBase32()
}

const jie = () => {
  if (!inputText.value) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '请先填写数据',
      type: 'error',
    })
    return
  }
  base32ToStr()
}

  const fuzhi = () => {
    if (!inputText.value) {
      // eslint-disable-next-line no-undef
      ElNotification({
        title: 'Error',
        message: '请先填写数据',
        type: 'error',
      })
      return
    }
    navigator.clipboard.writeText(inputText.value).then(() => {
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
    v-model="inputText"
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
