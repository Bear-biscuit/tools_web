<script setup>
import countryList from '@/assets/countryList.json'
import { ref, watch } from 'vue'

const getFlagEmoji = (countryCode) => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt())
  return String.fromCodePoint(...codePoints)


}
const countryValue = ref('')
const searchCountry = ref([])

const querySearch = (queryString, cb) => {
  const results = queryString
    ? restaurants.value.filter(item =>
      item.value.toLowerCase().includes(queryString.toLowerCase())
    )
    : restaurants.value
  cb(results)
}

const handleSelect = (item) => {
  searchCountry.value = [(item)]
}

const restaurants = ref([])

restaurants.value = countryList.map((item) => {
  return {
    value: item.name_zh,
    short_upper: item.short_upper,
    short_lower: item.short_lower
  }
})

const getimg = (short_lower) => {
  return '/img/conutry/' + short_lower + '.png'
}

const fuzhi = (code)=>{
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    return fallbackCopy(code) // 使用备用方案
  }

  navigator.clipboard.writeText(code).then(() => {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Success',
      message: '复制成功',
      type: 'success',
    })
  }).catch(() => {
    console.log(123)
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '复制失败,请尝试手动复制',
      type: 'error',
    })
  })
}

const fallbackCopy = (text) => {
  const textArea = document.createElement('textarea')
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.select()

  try {
    document.execCommand('copy')
    // eslint-disable-next-line no-undef
    ElNotification({ title: 'Success', message: '复制成功', type: 'success' })
  } catch (err) {
    console.log(err)
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '请手动复制（Ctrl+C）',
      type: 'error'
    })
  } finally {
    document.body.removeChild(textArea)
  }
}

watch(countryValue, (val) => {
  if (val === '') {
    searchCountry.value = []
  }
})

</script>
<template>
  <el-row class="pb-3">
      <el-autocomplete
        v-model="countryValue"
        :fetch-suggestions="querySearch"
        :trigger-on-focus="false"
        clearable
        class="w-full max-w-6xl"
        placeholder="点击国旗即可复制"
        @select="handleSelect"
      />
  </el-row>
  <el-row :gutter="5">
    <el-col
      :xs="4"
      :sm="3"
      :md="2"
      :lg="1"
      v-for="item in searchCountry.length?searchCountry : countryList"
      :key="item.short_upper"
      class="text-center mb-3"
    >
      <img :src='getimg(item.short_lower)' class="flagImg" @click="fuzhi(getFlagEmoji(item.short_upper))">
      {{ item.short_upper }}
    </el-col>
  </el-row>

</template>
<style>
.flagImg {
  width: 80%;
  margin: 0 auto;
}
</style>
