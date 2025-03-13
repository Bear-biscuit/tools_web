<script setup>
import {ref, watch} from "vue"

const props = defineProps({
  cronData: Object,
  cronToUi: Object
})

const z2_1 = ref(1)
const z2_1Item = ref([])
const z2_2 = ref(2)
const z2_2Item = ref([])
watch(z2_1, () => {
  z2_2Item.value.forEach(item => {
    item.disabled = false
  })
  for (let i = z2_1.value; i > 0; i--) {
    z2_2Item.value[i - 1].disabled = true
  }

  if (z2_2.value <= z2_1.value) {
    z2_2.value = z2_1.value + 1
  }
})

const z3_1 = ref(1)
const z3_2 = ref(1)
const z3_2Item = ref([])

const z4 = ref()
const z4Value = ref([])
const z4Item = ref([])
const z4ValeSet = () => {
  const chineseNumber = ['一', '二', '三', '四', '五', '六', '日']
  for (let i = 1; i < 8; i++) {
    z4Item.value.push({
      value: i,
      label: '周' + chineseNumber[i - 1],
      disabled: false
    })
  }
  z2_1Item.value = JSON.parse(JSON.stringify(z4Item.value))
  z2_1Item.value[6].disabled = true
  z2_2Item.value = JSON.parse(JSON.stringify(z4Item.value))
  z2_2Item.value[0].disabled = true
  z3_2Item.value = JSON.parse(JSON.stringify(z4Item.value))
}
z4ValeSet()
watch(z4Value, () => {
  z4.value = z4Value.value.join(",")
})

const z6 = ref('1L')
const z6Item = ref([])
const z6ValueSet = () => {
  const chineseNumber = ['一', '二', '三', '四', '五', '六', '日']
  for (let i = 1; i < 8; i++) {
    z6Item.value.push({
      value: i + 'L',
      label: '周' + chineseNumber[i - 1]
    })
  }
}
z6ValueSet()

watch([z2_1, z2_2, z3_1, z3_2, z4, z6], () => {
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.zhou.z2 = `${z2_1.value}-${z2_2.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.zhou.z3 = `${z3_2.value}#${z3_1.value}`
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.zhou.z4 = z4.value || '*'
  // eslint-disable-next-line vue/no-mutating-props
  props.cronData.zhou.z6 = z6.value || '*'
})

watch(() => props.cronToUi, () => {
    z2_2.value = Number(props.cronToUi.zhou.z2.split('-')[1])
    z2_1.value = Number(props.cronToUi.zhou.z2.split('-')[0])
    z3_2.value = Number(props.cronToUi.zhou.z3.split('#')[0])
    z3_1.value = Number(props.cronToUi.zhou.z3.split('#')[1])
    if (props.cronToUi.zhou.z4 !== '*') {
      z4Value.value = props.cronToUi.zhou.z4.includes(',') ? props.cronToUi.zhou.z4.split(',').map(Number) : [props.cronToUi.zhou.z4].map(Number)
    }
    z6.value = props.cronToUi.zhou.z6
  },
  {deep: true}
)

</script>
<template>
  <!--eslint-disable-next-line vue/no-mutating-props-->
  <el-radio-group v-model="cronData.zhou.type" class="radio-box ">
    <el-radio value="z1" size="large">周，通配符</el-radio>
    <el-radio value="z2" size="large">
      从
      <el-select
        v-model="z2_1"
        style="width: 100px"
      >
        <el-option
          v-for="item in z2_1Item"
          :key="item.value"
          :label="item.label"
          :value="item.value"
          :disabled="item.disabled"
        />
      </el-select>
      到
      <el-select
        v-model="z2_2"
        style="width: 100px"
      >
        <el-option
          v-for="item in z2_2Item"
          :key="item.value"
          :label="item.label"
          :value="item.value"
          :disabled="item.disabled"
        />
      </el-select>
      每天执行一次
    </el-radio>
    <el-radio value="z3" size="large">
      每月第
      <el-input-number v-model="z3_1" :min="1" :max="4" controls-position="right"/>
      个周的
      <el-select
        v-model="z3_2"
        style="width: 100px"
      >
        <el-option
          v-for="item in z3_2Item"
          :key="item.value"
          :label="item.label"
          :value="item.value"
          :disabled="item.disabled"
        />
      </el-select>
      执行一次
    </el-radio>
    <el-radio value="z4" size="large">
      指定
      <el-select
        v-model="z4Value"
        multiple
        placeholder="可多选"
        style="width: 240px"
        :max-collapse-tags="2"
        collapse-tags
        collapse-tags-tooltip
        clearable
      >
        <el-option
          v-for="item in z4Item"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-radio>
    <el-radio value="z5" size="large">不指定</el-radio>
    <el-radio value="z6" size="large">本月最后一个
      <el-select
        v-model="z6"
        placeholder="Select"
        size="large"
        style="width: 240px"
      >
        <el-option
          v-for="item in z6Item"
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
