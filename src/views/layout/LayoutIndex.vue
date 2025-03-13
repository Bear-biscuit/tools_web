<script setup>
import {ArrowLeftBold, ArrowRightBold} from "@element-plus/icons-vue"
import {ref, watch} from 'vue'
import {useRouter} from "vue-router"

import {useTabListStore} from "@/stores/index.js";

const route = useRouter()

const store = useTabListStore()

const isCollapse = ref(false)
const editableTabsValue = ref(route.currentRoute.value.path.split('/').filter(Boolean).pop())
watch(() => route.currentRoute.value.path, (newVal) => {
  editableTabsValue.value = newVal.split('/').filter(Boolean).pop()
})

const handleCilick = (name, title) => {
  if (!store.chakan(name)) {
    store.addTab({title, name})
  }
}

const handleTabsEdit = (targetName, action) => {
  if (action === 'remove') {
    const tabs = store.getList
    let activeName = editableTabsValue.value
    if (activeName === targetName) {
      tabs.forEach((tab, index) => {
        if (tab.name === targetName) {
          const nextTab = tabs[index + 1] || tabs[index - 1]
          if (nextTab) {
            activeName = nextTab.name
          }
        }
      })
    }
    editableTabsValue.value = activeName
    route.push('/' + activeName)
    store.removeTab(targetName)
  }
}


const handleTabsCilck = (tab) => {
  route.push('/' + tab.props.name)
}


</script>
<template>
  <div class="common-layout">
    <el-container>
      <el-aside width="auto">
        <el-menu
          :default-active="route.currentRoute.value.path.split('/').filter(Boolean).pop()"
          class="h-full"
          :collapse="isCollapse"
          router
        >
          <el-menu-item class="mao">
            <el-tooltip
              class="box-item"
              effect="light"
              content="旁边的箭头可以折叠\打开目录喵~~"
              placement="bottom"
            >
              <img
                src="data:image/png;base64,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"
                alt="">
            </el-tooltip>
          </el-menu-item>
          <el-sub-menu index="1">
            <template #title>
              <el-icon>
                <i class="iconfont icon-json"></i>
              </el-icon>
              <span>Json 处理</span>
            </template>
            <el-menu-item @click="handleCilick('json1','Json 美化')" index="json1">Json 美化
            </el-menu-item>
            <el-menu-item @click="handleCilick('json2','Json 解析')" index="json2">Json 解析
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="2">
            <template #title>
              <el-icon>
                <i class="iconfont icon-shuju"></i>
              </el-icon>
              <span>数据转换</span>
            </template>
            <el-menu-item @click="handleCilick('unicode','Unicode & 中文')" index="unicode">Unicode
              & 中文
            </el-menu-item>
            <el-menu-item @click="handleCilick('base64','Base64 编码/解码')" index="base64">Base64
              编码/解码
            </el-menu-item>
            <el-menu-item @click="handleCilick('base32','Base32 编码/解码')" index="base32">Base32
              编码/解码
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item @click="handleCilick('flag','国家旗帜代码')" index="flag">
            <el-icon>
              <i class="iconfont icon-qizhi01"></i>
            </el-icon>
            <span>国家旗帜代码</span>
          </el-menu-item>
          <el-menu-item @click="handleCilick('code','Java 在线')" index="code">
            <el-icon>
              <i class="iconfont icon-java"></i>
            </el-icon>
            <span>Java 在线</span>
          </el-menu-item>
          <el-menu-item @click="handleCilick('cron','cron 表达式')" index="cron">
            <el-icon>
              <i class="iconfont icon-zuocedaohang_dingshirenwu"></i>
            </el-icon>
            <span>cron 表达式</span>
          </el-menu-item>
          <el-menu-item @click="handleCilick('font','字体转换')" index="font">
            <el-icon>
              <i class="iconfont icon-tolowercase"></i>
            </el-icon>
            <span>字体转换</span>
          </el-menu-item>
          <el-menu-item @click="handleCilick('emoji','emoji合成')" index="emoji">
            <el-icon>
              <i class="iconfont icon-emoji"></i>
            </el-icon>
            <span>emoji合成</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header class="header">
          <el-icon v-if="!isCollapse" @click="isCollapse = !isCollapse">
            <ArrowLeftBold/>
          </el-icon>
          <el-icon v-else @click="isCollapse = !isCollapse">
            <ArrowRightBold/>
          </el-icon>
        </el-header>
        <el-main>
          <el-tabs
            v-model="editableTabsValue"
            type="card"
            class="h-full"
            @edit="handleTabsEdit"
            @tab-click="handleTabsCilck"
          >
            <el-tab-pane
              v-for="item in store.getList"
              :key="item.name"
              :label="item.title"
              :name="item.name"
              class="h-full"
              :closable="item.name !== 'json1'"
            >
              <el-card class="w-full h-full card" style="overflow: auto">
                <router-view/>
              </el-card>
            </el-tab-pane>
          </el-tabs>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<style scoped>
.common-layout {
  height: 100%;
  display: flex;
}

.header {
  background-color: #ffffff;
  color: #aeaeae;
  line-height: 60px;
}

.mao {
  display: flex;
  justify-content: center;
  align-items: center;
}

.mao img {
  width: 60px;
}
.card {
  overflow: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */

  ::-webkit-scrollbar {
    display: none; /* Chrome Safari */
  }
}
</style>
