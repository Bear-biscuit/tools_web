<script setup>
import {ref, watch} from "vue"

const props = defineProps({
  cronData: Object,
  cronToUi: Object
})

const s2_1 = ref(0)
const s2_2 = ref(1)
watch(s2_1, () => {
  if (s2_2.value <= s2_1.value) {
    s2_2.value = s2_1.value + 1
  }
})

const s3_1 = ref(0)
const s3_2 = ref(1)
watch(s3_1, ()=>{
  if (s3_1.value + s3_2.value > 23) {
    s3_2.value = 23 - s3_1.value
  }
})

const s4 = ref()
const s4Value = ref([])
const s4Item = ref([])
const s4ValeSet = () => {
  for (let i = 0; i < 24; i++) {
    s4Item.value.push({
      value: i,
      label: i + '时'
    })
  }
  return s4Item.value
}
s4ValeSet()
watch(s4Value, () => {
  s4.value = s4Value.value.join(",")
})
watch([s2_1, s2_2, s3_1, s3_2, s4], () => {
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.shi.s2 = `${s2_1.value}-${s2_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.shi.s3 = `${s3_1.value}/${s3_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.shi.s4 = s4.value || '*'

})

watch(() => props.cronToUi, () => {
    s2_2.value = Number(props.cronToUi.shi.s2.split('-')[1])
    s2_1.value = Number(props.cronToUi.shi.s2.split('-')[0])
    s3_2.value = Number(props.cronToUi.shi.s3.split('/')[1])
    s3_1.value = Number(props.cronToUi.shi.s3.split('/')[0])
    if (props.cronToUi.shi.s4 !== '*') {
      s4Value.value = props.cronToUi.shi.s4.includes(',') ? props.cronToUi.shi.s4.split(',').map(Number) : [props.cronToUi.shi.s4].map(Number)
    }
  },
  {deep: true}
)

</script>
<template>
  <!--eslint-disable-next-line vue/no-mutating-props-->
  <el-radio-group v-model="cronData.shi.type" class="radio-box ">
    <el-radio value="s1" size="large">时，通配符</el-radio>
    <el-radio value="s2" size="large">
      从
      <el-input-number v-model="s2_1" :min="0" :max="22" controls-position="right"/>
      时，到
      <el-input-number v-model="s2_2" :min="s2_1+1" :max="23" controls-position="right"/>
      时，每小时执行一次
    </el-radio>
    <el-radio value="s3" size="large">
      从第
      <el-input-number v-model="s3_1" :min="0" :max="22" controls-position="right"/>
      小时开始，每
      <el-input-number v-model="s3_2" :min="1" :max="23-s3_1" controls-position="right"/>
      小时执行一次
    </el-radio>
    <div>
      <el-radio value="s4" size="large">
        指定
        <el-select
          v-model="s4Value"
          multiple
          placeholder="可多选"
          style="width: 240px"
          :max-collapse-tags="2"
          collapse-tags
          collapse-tags-tooltip
          clearable
        >
          <el-option
            v-for="item in s4Item"
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
