<script setup>
import {ref, computed, watch} from "vue"
import {CronExpressionParser} from 'cron-parser'
import moment from 'moment-timezone'


import CronMiao from "@/components/CronMiao.vue"
import CronFen from "@/components/CronFen.vue"
import CronShi from "@/components/CronShi.vue"
import CronYue from "@/components/CronYue.vue"
import CronRi from "@/components/CronRi.vue"
import CronZhou from "@/components/CronZhou.vue"
import CronNian from "@/components/CronNian.vue"
import dayjs from "dayjs"

// cron表达式数据
const cronData = ref({
  "miao": {
    'type': 'm1',
    'm1': '*',
    'm2': '0-1',
    'm3': '0/1',
    'm4': '*'
  },
  "fen": {
    'type': 'f1',
    'f1': '*',
    'f2': '0-1',
    'f3': '0/1',
    'f4': '*'
  },
  "shi": {
    'type': 's1',
    's1': '*',
    's2': '0-1',
    's3': '0/1',
    's4': '*'
  },
  "ri": {
    'type': 'r1',
    'r1': '*',
    'r2': '1-2',
    'r3': '1/1',
    'r4': '*',
    'r5': '?',
    'r6': 'L'
  },
  "yue": {
    'type': 'y1',
    'y1': '*',
    'y2': '1-2',
    'y3': '1/1',
    'y4': '*'
  },
  "zhou": {
    'type': 'z5',
    'z1': '*',
    'z2': '1-2',
    'z3': '1#1',
    'z4': '*',
    'z5': '?',
    'z6': '1L'
  },
  "nian": {
    'type': 'n1',
    'n1': '',
    'n2': new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    'n3': '1/1',
    'n4': '',
    'n5': '*'
  }

})

// 用于重置
const reSet = JSON.parse(JSON.stringify(cronData.value))

// cron表达式结果
const cronStr = ref('')

const getCronStr = computed(() => {
  // eslint-disable-next-line vue/no-side-effects-in-computed-properties
  cronStr.value = `${cronData.value.miao[cronData.value.miao.type]} ${cronData.value.fen[cronData.value.fen.type]} ${cronData.value.shi[cronData.value.shi.type]} ${cronData.value.ri[cronData.value.ri.type]} ${cronData.value.yue[cronData.value.yue.type]} ${cronData.value.zhou[cronData.value.zhou.type]} ${cronData.value.nian[cronData.value.nian.type]}`
  return cronStr.value.trim()
})

// 计算属性，用于获取cron表达式数据
const getCronValue = computed(() => {
  return cronData.value
})

// 监听cron表达式特定数据变化
watch(
  () => cronData.value.ri.type,
  (newValue) => {
    if (newValue !== 'r5') {
      cronData.value.zhou.type = 'z5'
    }
  }
)

watch(
  () => cronData.value.zhou.type,
  (newValue) => {
    if (newValue !== 'z5') {
      cronData.value.ri.type = 'r5'
    }
  }
)

watch(() => cronData.value, () => {
    parseCronExpression(getCronStr.value)
  },
  {deep: true}
)

// 输入的cron表达式
const cronInput = ref('')

// 用于反解析
const cronToUi = ref()

// cron表达式运行结果
const requsetCron = ref([])

// cron运行解析
const parseCronExpression = (expression) => {

  // L 单月份 bug修复
  const bug = ref('')

  // 清空cron表达式运行结果
  requsetCron.value = []

  // 解析cron表达式
  const dataArr = expression.split(' ')

  if (dataArr[3] === 'L' && !(dataArr[4].includes(',') || dataArr[4].includes('-') || dataArr[4].includes('/') || dataArr[4].includes('*'))) {
    const days_in_month = ['31', '28', '31', '30', '31', '30', '31', '31', '30', '31', '30', '31']
    dataArr[3] = days_in_month[Number(dataArr[4])-1]
  }
  const year = ref()

  // 判断是否有年份
  if (dataArr.length === 7) {

    // 获取年份
    year.value = dataArr[6]

    // 删除年份
    dataArr.pop()
  }

  // 重新拼接cron表达式
  expression = dataArr.join(' ')

  // 如果有年份
  if (year.value) {
    // 判断年份是否为范围
    if (year.value.includes('-')) {
      const now = moment.tz('Asia/Shanghai').toDate()
      const starTime = now > moment.tz(Number(year.value.split('-')[0]) - 1 + '-12-31 23:59:59', 'Asia/Shanghai').toDate() ? now : moment.tz(Number(year.value.split('-')[0]) - 1 + '-12-31 23:59:59', 'Asia/Shanghai').toDate()
      const options = {
        currentDate: starTime,
        endDate: moment.tz(Number(year.value.split('-')[1]) + '-12-31 23:59:59', 'Asia/Shanghai').toDate(),
        tz: 'Asia/Shanghai',
        seconds: true
      }
      try {
        const interval = CronExpressionParser.parse(expression.trim(), options)

        while (requsetCron.value.length < 5) {
          requsetCron.value.push(dayjs(interval.next()).format('YYYY-MM-DD HH:mm:ss'))
          if (bug.value) {
            requsetCron.value = requsetCron.value.map((item) => {
              if (!item.includes(bug.value)) {
                return item
              }
            })
          }
        }

      } catch (err) {
        console.log('Error:', err.message)
      }
      //   判断年份是否为周期
    } else if (year.value.includes('/')) {
      let year_s = Number(year.value.split('/')[0])
      let endYear = Number(year.value.split('/')[0])
      while (requsetCron.value.length < 5) {
        const now = moment.tz('Asia/Shanghai').toDate()
        const starTime = now > moment.tz(year_s - 1 + '-12-31 23:59:59', 'Asia/Shanghai').toDate() ? now : moment.tz(year_s - 1 + '-12-31 23:59:59', 'Asia/Shanghai').toDate()
        const options = {
          currentDate: starTime,
          endDate: moment.tz(`${year_s}-12-31 23:59:59`, 'Asia/Shanghai').toDate(),
          tz: 'Asia/Shanghai',
          seconds: true
        }
        try {
          const interval = CronExpressionParser.parse(expression.trim(), options)

          while (requsetCron.value.length < 5) {
            requsetCron.value.push(dayjs(interval.next()).format('YYYY-MM-DD HH:mm:ss'))
            if (bug.value) {
              requsetCron.value = requsetCron.value.map((item) => {
                if (!item.includes(bug.value)) {
                  return item
                }
              })
            }
          }

        } catch (err) {
          console.log('Error:', err.message)
        }
        year_s += Number(year.value.split('/')[1])
        if (year_s > endYear + 100) {
          break
        }
      }
      //   判断年份是否为通配符
    } else if (year.value.includes('*')) {
      try {
        const interval = CronExpressionParser.parse(expression.trim())
        while (requsetCron.value.length < 5) {
          requsetCron.value.push(dayjs(interval.next()).format('YYYY-MM-DD HH:mm:ss'))
          if (bug.value) {
            requsetCron.value = requsetCron.value.map((item) => {
              if (!item.includes(bug.value)) {
                return item
              }
            })
          }
        }
      } catch (err) {
        console.log('Error:', err.message)
      }
      //   判断年份是否为列表
    } else {
      const yearArr = year.value.includes(',') ? year.value.split(',') : [year.value]
      yearArr.forEach(item => {
        const now = moment.tz('Asia/Shanghai').toDate()
        const startIme = now > moment.tz(`${item - 1}-12-31 23:59:59`, 'Asia/Shanghai').toDate() ? now : moment.tz(`${item - 1}-12-31 23:59:59`, 'Asia/Shanghai').toDate()
        const options = {
          currentDate: startIme,
          endDate: moment.tz(`${item}-12-31 23:59:59`, 'Asia/Shanghai').toDate(),
          tz: 'Asia/Shanghai',
          seconds: true
        }
        try {
          const interval = CronExpressionParser.parse(expression.trim(), options)

          while (requsetCron.value.length < 5) {
            requsetCron.value.push(dayjs(interval.next()).format('YYYY-MM-DD HH:mm:ss'))
            if (bug.value) {
              requsetCron.value = requsetCron.value.map((item) => {
                if (!item.includes(bug.value)) {
                  return item
                }
              })
            }
          }
        } catch (err) {
          console.log('Error:', err.message)
        }
      })
    }
    //   没有年份
  } else {
    requsetCron.value = []
    const options = {
      tz: 'Asia/Shanghai'
    }

    try {
      const interval = CronExpressionParser.parse(expression.trim(), options)

      while (requsetCron.value.length < 5) {
        requsetCron.value.push(dayjs(interval.next()).format('YYYY-MM-DD HH:mm:ss'))
      }
    } catch (err) {
      console.log('Error:', err.message)
    }
  }
}

// 解析输入的cron表达式
const parseInputCron = () => {
  let cornStr = cronInput.value.trim()
  const dataArr = cornStr.split(' ')
  const year = ref()
  if (dataArr.length < 5 || dataArr.length > 7) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: 'cron表达式格式错误',
      type: 'error',
    })
    return
  }

  // 判断是否有年份
  if (dataArr.length === 7) {

    // 获取年份
    year.value = dataArr[6]

    // 删除年份
    dataArr.pop()
  }

  // 重新拼接cron表达式
  cornStr = dataArr.join(' ')

  // 判断cron表达式是否正确
  try {
    const interval = CronExpressionParser.parse(cornStr.trim())
    console.log(dayjs(interval.next()).format('YYYY-MM-DD HH:mm:ss'))
  } catch (err) {
    if(!(err.message.includes('Invalid explicit day of month definition') && dataArr[3] === 'L')){
      // eslint-disable-next-line no-undef
      ElNotification({
        title: 'Error',
        message: err.message,
        type: 'error',
      })
      return
    }
  }


  // 反解析cron表达式
  dataArr.forEach((item, index) => {
    if (index === 0) {
      if (item.includes('*')) {
        cronData.value.miao.type = 'm1'
        cronData.value.miao.m1 = item

      } else if (item.includes('-')) {
        cronData.value.miao.type = 'm2'
        cronData.value.miao.m2 = item
      } else if (item.includes('/')) {
        cronData.value.miao.type = 'm3'
        cronData.value.miao.m3 = item
      } else {
        cronData.value.miao.type = 'm4'
        cronData.value.miao.m4 = item
      }
    } else if (index === 1) {
      if (item.includes('*')) {
        cronData.value.fen.type = 'f1'
        cronData.value.fen.f1 = item
      } else if (item.includes('-')) {
        cronData.value.fen.type = 'f2'
        cronData.value.fen.f2 = item
      } else if (item.includes('/')) {
        cronData.value.fen.type = 'f3'
        cronData.value.fen.f3 = item
      } else {
        cronData.value.fen.type = 'f4'
        cronData.value.fen.f4 = item
      }
    } else if (index === 2) {
      if (item.includes('*')) {
        cronData.value.shi.type = 's1'
        cronData.value.shi.s1 = item
      } else if (item.includes('-')) {
        cronData.value.shi.type = 's2'
        cronData.value.shi.s2 = item
      } else if (item.includes('/')) {
        cronData.value.shi.type = 's3'
        cronData.value.shi.s3 = item
      } else {
        cronData.value.shi.type = 's4'
        cronData.value.shi.s4 = item
      }
    } else if (index === 3) {
      if (item.includes('*')) {
        cronData.value.ri.type = 'r1'
        cronData.value.ri.r1 = item
      } else if (item.includes('-')) {
        cronData.value.ri.type = 'r2'
        cronData.value.ri.r2 = item
      } else if (item.includes('/')) {
        cronData.value.ri.type = 'r3'
        cronData.value.ri.r3 = item
      } else if (item.includes('?')) {
        cronData.value.ri.type = 'r5'
        cronData.value.ri.r5 = item
      } else if (item.includes('L')) {
        cronData.value.ri.type = 'r6'
        cronData.value.ri.r6 = item
      } else {
        cronData.value.ri.type = 'r4'
        cronData.value.ri.r4 = item
      }
    } else if (index === 4) {
      if (item.includes('*')) {
        cronData.value.yue.type = 'y1'
        cronData.value.yue.y1 = item
      } else if (item.includes('-')) {
        cronData.value.yue.type = 'y2'
        cronData.value.yue.y2 = item
      } else if (item.includes('/')) {
        cronData.value.yue.type = 'y3'
        cronData.value.yue.y3 = item
      } else {
        cronData.value.yue.type = 'y4'
        cronData.value.yue.y4 = item
      }
    } else if (index === 5) {
      if (item.includes('*')) {
        cronData.value.zhou.type = 'z1'
        cronData.value.zhou.z1 = item
      } else if (item.includes('-')) {
        cronData.value.zhou.type = 'z2'
        cronData.value.zhou.z2 = item
      } else if (item.includes('#')) {
        cronData.value.zhou.type = 'z3'
        cronData.value.zhou.z3 = item
      } else if (item.includes('?')) {
        cronData.value.zhou.type = 'z5'
        cronData.value.zhou.z5 = item
      } else if (item.includes('L')) {
        cronData.value.zhou.type = 'z6'
        cronData.value.zhou.z6 = item
      } else {
        cronData.value.zhou.type = 'z4'
        cronData.value.zhou.z4 = item
      }
    }
  })
  if (year.value) {
    if (year.value.includes('*')) {
      cronData.value.nian.type = 'n5'
      cronData.value.nian.n5 = year.value
    }
    else if (year.value.includes('-')) {
      cronData.value.nian.type = 'n2'
      cronData.value.nian.n2 = year.value
    }
    else if (year.value.includes('/')) {
      cronData.value.nian.type = 'n3'
      cronData.value.nian.n3 = year.value
    }
    else {
      cronData.value.nian.type = 'n4'
      cronData.value.nian.n4 = year.value
    }
  }
  cronToUi.value = JSON.parse(JSON.stringify(cronData.value))
}

const copy = ()=> {
  if (!cronStr.value) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: '请先填写数据',
      type: 'error',
    })
    return
  }
  navigator.clipboard.writeText(cronStr.value).then(() => {
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

const reSetCron = ()=> {
  cronData.value = JSON.parse(JSON.stringify(reSet))
  cronToUi.value = JSON.parse(JSON.stringify(reSet))

}

</script>
<template>
  <el-input
    v-model="cronInput"
    placeholder="cron表达式"
    class="input-with-select mt-3"
    size="large"
  >
    <template #append>
      <el-button @click="parseInputCron">解析表达式</el-button>
    </template>
  </el-input>
  <el-tabs type="border-card" class="mt-10 shadow-sm shadow-gray-200">
    <el-tab-pane label="秒">
      <div>
        <CronMiao :cronData :cronToUi/>
      </div>
    </el-tab-pane>
    <el-tab-pane label="分">
      <CronFen :cronData :cronToUi/>
    </el-tab-pane>
    <el-tab-pane label="时">
      <CronShi :cronData :cronToUi/>
    </el-tab-pane>
    <el-tab-pane label="日">
      <CronRi :cronData :cronToUi/>
    </el-tab-pane>
    <el-tab-pane label="月">
      <CronYue :cronData :cronToUi/>
    </el-tab-pane>
    <el-tab-pane label="周">
      <CronZhou :cronData :cronToUi/>
    </el-tab-pane>
    <el-tab-pane label="年">
      <CronNian :cronData :cronToUi/>
    </el-tab-pane>
  </el-tabs>
  <div class="mt-10 cron-box shadow-sm shadow-gray-200">
    <span class="textTitle">时间表达式</span>
    <table class="w-full">
      <tbody>
      <tr>
        <th style="width: 5%">
          秒
        </th>
        <th style="width: 5%">
          分
        </th>
        <th style="width: 5%">
          时
        </th>
        <th style="width: 5%">
          日
        </th>
        <th style="width: 5%">
          月
        </th>
        <th style="width: 5%">
          周
        </th>
        <th style="width: 5%">
          年
        </th>
        <th class="w-1/2">
          Cron 表达式
        </th>
      </tr>
      <tr>
        <td class="text-center p-1 cron-td"><span
          class="cron-span">{{ getCronValue.miao[getCronValue.miao.type] }}</span></td>
        <td class="text-center p-1 cron-td"><span
          class="cron-span">{{ getCronValue.fen[getCronValue.fen.type] }}</span></td>
        <td class="text-center p-1 cron-td"><span
          class="cron-span">{{ getCronValue.shi[getCronValue.shi.type] }}</span></td>
        <td class="text-center p-1 cron-td"><span
          class="cron-span">{{ getCronValue.ri[getCronValue.ri.type] }}</span></td>
        <td class="text-center p-1 cron-td"><span
          class="cron-span">{{ getCronValue.yue[getCronValue.yue.type] }}</span></td>
        <td class="text-center p-1 cron-td"><span
          class="cron-span">{{ getCronValue.zhou[getCronValue.zhou.type] }}</span></td>
        <td class="text-center p-1 cron-td"><span
          class="cron-span">{{ getCronValue.nian[getCronValue.nian.type] }}</span></td>
        <td class="text-center p-1 cron-td"><span class="cron-span">{{ getCronStr }}</span></td>
      </tr>
      </tbody>
    </table>
  </div>
  <div class="mt-4 text-center">
    <el-button type="success" @click="copy">复制</el-button>
    <el-button type="warning" @click="reSetCron">重置</el-button>
  </div>
  <el-card v-if="requsetCron.length > 0" shadow="always" class="mt-4 text-center">
    <span>近5次运行时间</span>
    <ul>
      <li v-for="item in requsetCron" :key="item">{{ item }}</li>
    </ul>
  </el-card>
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

.cron-box {
  border: 1px solid #dfdfdf;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.textTitle {
  text-align: center;
  transform: translateY(-50%);
  background-color: white;
  width: 9em;
}

.cron-span {
  display: block;
  width: 100%;
  font-family: arial, serif;
  line-height: 30px;
  height: 30px;
  white-space: nowrap;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  font-size: 12px;
}

</style>

