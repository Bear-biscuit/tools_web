import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia

import {useTabListStore} from "@/stores/layout/tabList.js"

export {
useTabListStore
}
