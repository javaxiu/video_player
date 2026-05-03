import { createRouter, createWebHistory } from 'vue-router'
import VideoView from '../views/VideoView.vue'
import WarmView from '../views/Warm.vue'
import WarmCover from '../views/WarmCover.vue'
import Tyy from '../views/Tyy.vue'
import Bus from '../views/Bus.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/video',
      name: 'video',
      component: VideoView,
    },
    {
      path: '/warm-detail',
      name: 'warm-detail',
      component: WarmView,
    },
    {
      path: '/warm',
      name: 'warm',
      component: WarmCover,
    },
    {
      path: '/tyy',
      name: 'tyy',
      component: Tyy,
    },
    {
      path: '/bus',
      name: 'bus',
      component: Bus,
    },
  ],
})

export default router
