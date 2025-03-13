<script setup>
import {ref, watch} from "vue"

const props = defineProps({
  cronData: Object,
  cronToUi: Object
})

const r2_1 = ref(0)
const r2_2 = ref(1)
watch(r2_1, () => {
  if (r2_2.value <= r2_1.value) {
    r2_2.value = r2_1.value + 1
  }
})

const r3_1 = ref(0)
const r3_2 = ref(1)
watch(r3_1, () => {
  if (r3_1.value + r3_2.value > 31) {
    r3_2.value = 31 - r3_1.value
  }
})

const r4 = ref()
const r4Value = ref([])
const r4Item = ref([])
const r4ValeSet = () => {
  for (let i = 1; i < 32; i++) {
    r4Item.value.push({
      value: i,
      label: i + '号'
    })
  }
  return r4Item.value
}
r4ValeSet()
watch(r4Value, () => {
  r4.value = r4Value.value.join(",")
})
watch([r2_1, r2_2, r3_1, r3_2, r4], () => {
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.ri.r2 = `${r2_1.value}-${r2_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.ri.r3 = `${r3_1.value}/${r3_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.ri.r4 = r4.value || '*'

})

watch(() => props.cronToUi, () => {
    r2_2.value = Number(props.cronToUi.ri.r2.split('-')[1])
    r2_1.value = Number(props.cronToUi.ri.r2.split('-')[0])
    r3_2.value = Number(props.cronToUi.ri.r3.split('/')[1])
    r3_1.value = Number(props.cronToUi.ri.r3.split('/')[0])
    if (props.cronToUi.ri.r4 !== '*') {
      r4Value.value = props.cronToUi.ri.r4.includes(',') ? props.cronToUi.ri.r4.split(',').map(Number) : [props.cronToUi.ri.r4].map(Number)
    }
  },
  {deep: true}
)

</script>
<template>
  <el-radio-group v-model="cronData.ri.type" class="radio-box ">
    <el-radio value="r1" size="large">日，通配符</el-radio>
    <el-radio value="r2" size="large">
      从第
      <el-input-number v-model="r2_1" :min="1" :max="30" controls-position="right"/>
      日，到
      <el-input-number v-model="r2_2" :min="r2_1+1" :max="31" controls-position="right"/>
      日，每天执行一次
    </el-radio>
    <el-radio value="r3" size="large">
      从第
      <el-input-number v-model="r3_1" :min="1" :max="30" controls-position="right"/>
      号开始，每
      <el-input-number v-model="r3_2" :min="1" :max="31-r3_1" controls-position="right"/>
      天执行一次
    </el-radio>
      <el-radio value="r4" size="large">
        指定
        <el-select
          v-model="r4Value"
          multiple
          placeholder="可多选"
          style="width: 240px"
          :max-collapse-tags="2"
          collapse-tags
          collapse-tags-tooltip
          clearable
        >
          <el-option
            v-for="item in r4Item"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-radio>
      <el-radio value="r5" size="large">不指定</el-radio>
      <el-radio value="r6" size="large">本月最后一天</el-radio>
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
