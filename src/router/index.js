import {createRouter, createWebHistory} from 'vue-router'
import {useTabListStore} from "@/stores/index.js";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/views/layout/LayoutIndex.vue'),
      redirect: '/json1',
      children: [
        {
          path: '/json1',
          component: () => import('@/views/JsonTab/Json1Tab.vue'),
        },
        {
          path: '/json2',
          component: () => import('@/views/JsonTab/Json2Tab.vue'),
        },
        {
          path: '/unicode',
          component: () => import('@/views/DataTab/UnicodeTab.vue'),
        },
        {
          path: '/base64',
          component: () => import('@/views/DataTab/Base64Tab.vue'),
        },
        {
          path: '/base32',
          component: () => import('@/views/DataTab/Base32Tab.vue'),
        },
        {
          path: '/flag',
          component: () => import('@/views/FlagTab/FlagEmoji.vue'),
        },
        {
          path: '/code',
          component: () => import('@/views/JavaTab/JavaTab.vue'),
        },
        {
          path: '/cron',
          component: () => import('@/views/CronTab/CronTab.vue'),
        },
        {
          path: '/font',
          component: () => import('@/views/FontTab/FontTab.vue'),
        },
        {
          path: '/emoji',
          component: () => import('@/views/EmojiTab/EmojiTab.vue'),
        }
      ]
    }]
})

router.beforeEach( async (to) => {
  const store = useTabListStore()
  if (store.getList.some(item => item.name  === to.path.split('/')[1])){
    return true
  }
  else await router.push({
    path: '/'
  })
})

export default router
