<script setup>
import {ref, watch} from "vue"

const props = defineProps({
  cronData: Object,
  cronToUi: Object
})

const f2_1 = ref(0)
const f2_2 = ref(1)
watch(f2_1, () => {
  if (f2_2.value <= f2_1.value) {
    f2_2.value = f2_1.value + 1
  }
})

const f3_1 = ref(0)
const f3_2 = ref(1)
watch(f3_1, () => {
  if (f3_1.value + f3_2.value > 59) {
    f3_2.value = 59 - f3_1.value
  }
})

const f4 = ref()
const f4Value = ref([])
const f4Item = ref([])
const f4ValeSet = () => {
  for (let i = 0; i < 60; i++) {
    f4Item.value.push({
      value: i,
      label: i + '分'
    })
  }
  return f4Item.value
}
f4ValeSet()
watch(f4Value, () => {
  f4.value = f4Value.value.join(",")
})
watch([f2_1, f2_2, f3_1, f3_2, f4], () => {
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.fen.f2 = `${f2_1.value}-${f2_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.fen.f3 = `${f3_1.value}/${f3_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.fen.f4 = f4.value || '*'

})

watch(() => props.cronToUi, () => {
    f2_2.value = Number(props.cronToUi.fen.f2.split('-')[1])
    f2_1.value = Number(props.cronToUi.fen.f2.split('-')[0])
    f3_2.value = Number(props.cronToUi.fen.f3.split('/')[1])
    f3_1.value = Number(props.cronToUi.fen.f3.split('/')[0])
    if (props.cronToUi.fen.f4 !== '*') {
      f4Value.value = props.cronToUi.fen.f4.includes(',') ? props.cronToUi.fen.f4.split(',').map(Number) : [props.cronToUi.fen.f4].map(Number)
    }
  },
  {deep: true}
)

</script>
<template>
  <!--eslint-disable-next-line vue/no-mutating-props-->
  <el-radio-group v-model="cronData.fen.type" class="radio-box ">
    <el-radio value="f1" size="large">分，通配符</el-radio>
    <el-radio value="f2" size="large">
      从
      <el-input-number v-model="f2_1" :min="0" :max="58" controls-position="right"/>
      分，到
      <el-input-number v-model="f2_2" :min="f2_1+1" :max="59" controls-position="right"/>
      分，每分执行一次
    </el-radio>
    <el-radio value="f3" size="large">
      从第
      <el-input-number v-model="f3_1" :min="0" :max="59" controls-position="right"/>
      分开始，每
      <el-input-number v-model="f3_2" :min="1" :max="59-f3_1" controls-position="right"/>
      分执行一次
    </el-radio>
    <div>
      <el-radio value="f4" size="large">
        指定
        <el-select
          v-model="f4Value"
          multiple
          placeholder="可多选"
          style="width: 240px"
          :max-collapse-tags="2"
          collapse-tags
          collapse-tags-tooltip
          clearable
        >
          <el-option
            v-for="item in f4Item"
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
