import { createRouter, createWebHistory } from 'vue-router'
import VideoView from '../views/VideoView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/video',
      name: 'video',
      component: VideoView,
    },
  ],
})

export default router
