<script setup>
import {ref, watch, computed} from "vue"

const props = defineProps({
  cronData: Object,
  cronToUi: Object
})

const m2_1 = ref(0)
const m2_2 = ref(1)

watch(m2_1, () => {
  if (m2_2.value <= m2_1.value) {
    m2_2.value = m2_1.value + 1
  }
})

const m3_1 = ref(0)
const m3_2 = ref(1)
watch(m3_1, () => {
  if (m3_1.value + m3_2.value > 59) {
    m3_2.value = 59 - m3_1.value
  }
})

const m4 = ref()
const m4Value = ref([])
const m4Item = ref([])
const m4ValeSet = () => {
  for (let i = 0; i < 60; i++) {
    m4Item.value.push({
      value: i,
      label: i +'秒'
    })
  }
  return m4Item.value
}
m4ValeSet()
watch(m4Value, () => {
  m4.value = m4Value.value.join(",")
})
watch([m2_1, m2_2, m3_1, m3_2, m4], () => {
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.miao.m2 = `${m2_1.value}-${m2_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.miao.m3 = `${m3_1.value}/${m3_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.miao.m4 = m4.value || '*'

})

watch(() => props.cronToUi, () => {
    m2_2.value = Number(props.cronToUi.miao.m2.split('-')[1])
    m2_1.value = Number(props.cronToUi.miao.m2.split('-')[0])
    m3_2.value = Number(props.cronToUi.miao.m3.split('/')[1])
    m3_1.value = Number(props.cronToUi.miao.m3.split('/')[0])
    if (props.cronToUi.miao.m4 !== '*') {
      m4Value.value = props.cronToUi.miao.m4.includes(',') ? props.cronToUi.miao.m4.split(',').map(Number) : [props.cronToUi.miao.m4].map(Number)
    }
  },
  {deep: true}
)

</script>
<template>
  <!--eslint-disable-next-line vue/no-mutating-props-->
  <el-radio-group v-model="cronData.miao.type" class="radio-box ">
    <el-radio value="m1" size="large">秒，通配符</el-radio>
    <el-radio value="m2" size="large">
      从
      <el-input-number v-model="m2_1" :min="0" :max="58" controls-position="right"/>
      秒，到
      <el-input-number v-model="m2_2" :min="m2_1.value + 1" :max="59" controls-position="right"/>
      秒，每秒执行一次
    </el-radio>
    <el-radio value="m3" size="large">
      从
      <el-input-number v-model="m3_1" :min="0" :max="59" controls-position="right"/>
      秒开始，每
      <el-input-number v-model="m3_2" :min="1" :max="59-m3_1" controls-position="right"/>
      秒执行一次
    </el-radio>

    <el-radio value="m4" size="large">
      指定
      <el-select
        v-model="m4Value"
        multiple
        placeholder="可多选"
        style="width: 240px"
        :max-collapse-tags="2"
        collapse-tags
        collapse-tags-tooltip
        clearable
      >
        <el-option
          v-for="item in m4Item"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-radio>
  </el-radio-group>
</template>
<style scoped>
.el-radio {
  margin-right: 0px;
}

.radio-box {
  display: flex;
  flex-direction: column;
  align-items: start;
}

.el-input-number {
  width: 80px;
}
</style>
