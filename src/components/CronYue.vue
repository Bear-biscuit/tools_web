<script setup>
import {ref, watch} from "vue"

const props = defineProps({
  cronData: Object,
  cronToUi: Object
})

const y2_1 = ref(0)
const y2_2 = ref(1)
watch(y2_1, () => {
  if (y2_2.value <= y2_1.value) {
    y2_2.value = y2_1.value + 1
  }
})

const y3_1 = ref(0)
const y3_2 = ref(1)
watch(y3_1, () => {
  if (y3_1.value + y3_2.value > 12) {
    y3_2.value = 12 - y3_1.value
  }
})

const y4 = ref()
const y4Value = ref([])
const y4Item = ref([])
const y4ValeSet = () => {
  for (let i = 1; i < 13; i++) {
    y4Item.value.push({
      value: i,
      label: i + '月'
    })
  }
  return y4Item.value
}
y4ValeSet()
watch(y4Value, () => {
  y4.value = y4Value.value.join(",")
})
watch([y2_1, y2_2, y3_1, y3_2, y4], () => {
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.yue.y2 = `${y2_1.value}-${y2_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.yue.y3 = `${y3_1.value}/${y3_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.yue.y4 = y4.value || '*'

})

watch(() => props.cronToUi, () => {
    y2_2.value = Number(props.cronToUi.yue.y2.split('-')[1])
    y2_1.value = Number(props.cronToUi.yue.y2.split('-')[0])
    y3_2.value = Number(props.cronToUi.yue.y3.split('/')[1])
    y3_1.value = Number(props.cronToUi.yue.y3.split('/')[0])
    if (props.cronToUi.yue.y4 !== '*') {
      y4Value.value = props.cronToUi.yue.y4.includes(',') ? props.cronToUi.yue.y4.split(',').map(Number) : [props.cronToUi.yue.y4].map(Number)
    }
  },
  {deep: true}
)

</script>
<template>
  <!--eslint-disable-next-line vue/no-mutating-props-->
  <el-radio-group v-model="cronData.yue.type" class="radio-box ">
    <el-radio value="y1" size="large">月，通配符</el-radio>
    <el-radio value="y2" size="large">
      从第
      <el-input-number v-model="y2_1" :min="1" :max="11" controls-position="right"/>
      月，到
      <el-input-number v-model="y2_2" :min="2" :max="12" controls-position="right"/>
      月，每月执行一次
    </el-radio>
    <el-radio value="y3" size="large">
      从第
      <el-input-number v-model="y3_1" :min="1" :max="11" controls-position="right"/>
      月开始，每
      <el-input-number v-model="y3_2" :min="1" :max="12-y3_1" controls-position="right"/>
      月执行一次
    </el-radio>
    <div>
      <el-radio value="y4" size="large">
        指定
        <el-select
          v-model="y4Value"
          multiple
          placeholder="可多选"
          style="width: 240px"
          :max-collapse-tags="2"
          collapse-tags
          collapse-tags-tooltip
          clearable
        >
          <el-option
            v-for="item in y4Item"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-radio>
    </div>
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
