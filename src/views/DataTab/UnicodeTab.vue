<script setup>
import {ref,} from 'vue'

const unicodeData = ref()

const detectTextType = () => {
  // eslint-disable-next-line no-control-regex
  if (/^(\\u[\dA-Fa-f]{4})+$/.test(unicodeData.value)) {
    return 'Unicode'
    // eslint-disable-next-line no-control-regex
  } else if (/^[\x00-\x7F]*$/.test(unicodeData.value)) {
    return 'ASCII'
  } else if (/[\u4e00-\u9fa5]/.test(unicodeData.value)) {
    return 'Chinese'
  } else {
    return 'Unknown'
  }
}

const unicodeToChinese = (str) => {
  return str.replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
  })
}

const chineseToUnicode = (str) => {
  return str.replace(/[\u4E00-\u9FA5]/g, (match) => {
    return '\\u' + match.charCodeAt(0).toString(16)
  })
}

const zhuan = () => {
  if (!unicodeData.value) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '请先填写数据',
      type: 'error',
    })
    return
  }
  const type = detectTextType()
  switch (type) {
    case 'Unicode':
      unicodeData.value = unicodeToChinese(unicodeData.value)
      break
    case 'Chinese':
      unicodeData.value = chineseToUnicode(unicodeData.value)
      break
    default:
      // eslint-disable-next-line no-undef
      ElNotification({
        title: 'Error',
        message: '识别失败',
        type: 'error',
      })
      break
  }

}

const fuzhi = () => {
  if (!unicodeData.value) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '请先填写数据',
      type: 'error',
    })
    return
  }
  navigator.clipboard.writeText(unicodeData.value).then(() => {
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
    v-model="unicodeData"
    class="w-full"
    type="textarea"
    :autosize="{ minRows: 10, maxRows: 15 }"
    placeholder="请粘贴需要转换的数据"
  />

  <div class="button">
    <el-button type="primary" @click="zhuan">转换</el-button>
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
