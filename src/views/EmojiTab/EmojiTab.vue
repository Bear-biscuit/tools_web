<script setup>
import {ref, computed} from "vue"
import emojiJson from "@/assets/emoji.json"
import emojiList from "@/assets/emoji_list.json"

const baseUrl = ref("https://www.gstatic.com/android/keyboard/emojikitchen/")
const baseData = ref("20210521")
const baseId = ref("u1fa84/u1fa84_u1f600")
const and = ref(true)

const emojiImg = computed(() => {
  return emojiList.map((item) => {
    if (item.split("-").length > 2) {
      return item
    } else {
      return item.split("-")[0]
    }
  })
})
const leftEmoji = ref(emojiImg.value[0])
const rightEmoji = ref(emojiImg.value[1])
const upEmoji = (emoji) => {
  if (and.value) {
    leftEmoji.value = emoji
  } else {
    rightEmoji.value = emoji
  }
  requserEmoji()
}

const randomEmoji = () => {
  leftEmoji.value = emojiImg.value[Math.floor(Math.random() * (emojiImg.value.length + 1))]
  rightEmoji.value = emojiImg.value[Math.floor(Math.random() * (emojiImg.value.length + 1))]
}

const requserEmoji = () => {
  if (!leftEmoji.value || !rightEmoji.value) {
    return
  }
  const emojiArr = emojiJson.filter(item => {
    const arr = item.id.split("/")
    const arr1 = arr[1].split("_")
    if (leftEmoji.value === rightEmoji.value) {
      return item.id === leftEmoji.value + "/" + leftEmoji.value + "_" + leftEmoji.value
    }
    if (arr1.includes(leftEmoji.value) && arr1.includes(rightEmoji.value)) {
      return item
    }
  })
  const data = Math.max(...emojiArr.map(item => Number(item.data)))
  baseData.value = emojiArr.find(item => Number(item.data) === data).data
  baseId.value = emojiArr.find(item => Number(item.data) === data).id
}
const baseEmoji = computed(() => {
  return baseUrl.value + baseData.value + "/" + baseId.value + ".png"
})

const copyImg = async () => {
  try {
    const response = await fetch(baseEmoji.value);
    const blob = await response.blob()
    const item = new ClipboardItem({ [blob.type]: blob })
    await navigator.clipboard.write([item])
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Success',
      message: '复制成功',
      type: 'success',
    })
  }catch (e) {
    // eslint-disable-next-line no-undef
    ElNotification({
      title: 'Error',
      message: e,
      type: 'error',
    })
  }
}
</script>
<template>
  <el-affix :offset="157" style="width: 100%">
    <div class="emojiAnd">
      <img :src="'/img/emoji/emoji_'+leftEmoji+'.svg'" alt="emoji" :class="{active:and}"
           @click="and = true"/> ➕
      <img :src="'/img/emoji/emoji_'+rightEmoji+'.svg'" alt="emoji" :class="{active:!and}"
           @click="and = false"/>🟰
      <img :src="baseEmoji" alt="emoji" @click="copyImg"/>
    </div>
  </el-affix>
  <div class="emoji-list">
    <img v-for="name in emojiImg" :key="name" :src="'/img/emoji/emoji_'+name+'.svg'" alt="emoji"
         @click="upEmoji(name)"/>
  </div>
</template>
<style scoped>
.active {
  background-color: #dcdcdc;
}
  .emojiAnd {
    width: 100%;
    caret-color: transparent;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 10px 0 10px 0;
    backdrop-filter: blur(10px);
    background-color: rgba(244, 244, 244, 0.7);
    border-radius: 20px;

    img {
      width: 40px;
      height: 40px;
      box-sizing: content-box;
      border-radius: 8px;
      padding: 3px;
      margin: 5px;
    }
  }


.emoji-list {
  caret-color: transparent;
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;


  img {
    box-sizing: content-box;
    border-radius: 8px;
    padding: 3px;
    margin: 5px;
    width: 32px;
    height: 32px;

    &:hover {
      background-color: #f0f0f0;
    }
  }
}
</style>
