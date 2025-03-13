<script setup>
import {ref, watch} from "vue"

const props = defineProps({
  cronData: Object,
  cronToUi: Object
})

const n2_1 = ref(0)
const n2_2 = ref(1)
watch(n2_1, () => {
  if (n2_2.value <= n2_1.value) {
    n2_2.value = n2_1.value + 1
  }
})

const n3_1 = ref(0)
const n3_2 = ref(1)
watch(n3_1, ()=>{
  if (n3_1.value + n3_2.value > 23) {
    n3_2.value = 23 - n3_1.value
  }
})

const n4 = ref()
const n4Value = ref([])
const n4Item = ref([])
const n4ValeSet = () => {
  for (let i = 0; i < 20; i++) {
    n4Item.value.push({
      value: new Date().getFullYear() + i,
      label: new Date().getFullYear() + i + '年'
    })
  }
  return n4Item.value
}
n4ValeSet()
watch(n4Value, () => {
  n4.value = n4Value.value.join(",")
})
watch([n2_1, n2_2, n3_1, n3_2, n4], () => {
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.nian.n2 = `${n2_1.value}-${n2_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.nian.n3 = `${n3_1.value}/${n3_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.nian.n4 = n4.value || ''

})

watch(() => props.cronToUi, () => {
    n2_2.value = Number(props.cronToUi.nian.n2.split('-')[1])
    n2_1.value = Number(props.cronToUi.nian.n2.split('-')[0])
    n3_2.value = Number(props.cronToUi.nian.n3.split('/')[1])
    n3_1.value = Number(props.cronToUi.nian.n3.split('/')[0])
    if (props.cronToUi.nian.n4 !== '*') {
      n4Value.value = props.cronToUi.nian.n4.includes(',') ? props.cronToUi.nian.n4.split(',').map(Number) : [props.cronToUi.nian.n4].map(Number)
    }
  },
  {deep: true}
)

</script>
<template>
  <!--eslint-disable-next-line vue/no-mutating-props-->
  <el-radio-group v-model="cronData.nian.type" class="radio-box ">
    <el-radio value="n1" size="large">不指定，通配符</el-radio>
    <el-radio value="n2" size="large">
      从
      <el-input-number v-model="n2_1" :min="new Date().getFullYear()" :max="3000" controls-position="right"/>
      年，到
      <el-input-number v-model="n2_2" :min="n2_1+1" :max="n2_1 + 200" controls-position="right"/>
      年，每年执行一次
    </el-radio>
    <el-radio value="n3" size="large">
      从第
      <el-input-number v-model="n3_1" :min="new Date().getFullYear()" :max="3000" controls-position="right"/>
      年开始，每
      <el-input-number v-model="n3_2" :min="1" :max="200" controls-position="right"/>
      年执行一次
    </el-radio>
      <el-radio value="n4" size="large">
        指定
        <el-select
          v-model="n4Value"
          multiple
          placeholder="可多选"
          style="width: 240px"
          :max-collapse-tags="2"
          collapse-tags
          collapse-tags-tooltip
          clearable
        >
          <el-option
            v-for="item in n4Item"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-radio>
    <el-radio value="n5" size="large">每年</el-radio>
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
  width: 90px;
}
</style>
