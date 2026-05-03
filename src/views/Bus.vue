<template>
  <div class="bus-container">
    <div v-if="loading || contentList.length === 0" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>
    <template v-else>
      <div v-for="(item, index) in contentList" :key="index" class="content-item">
        <div class="content-header">
          <a :href="item.url" target="_blank" rel="noopener" class="text-l text-black">{{ item.title }}</a>
        </div>
        <div class="text-wrapper" :class="{ expanded: expandedItems[index] }" @click="toggleExpand(index)">
          <pre class="text text-gray-600">{{ item.text }}</pre>
          <div class="expand-btn" v-if="!expandedItems[index]">展开全文</div>
        </div>
        <div class="img-container">
          <ProxyImg
            v-for="(img, imgIndex) in (expandedItems[index] ? item.images : item.images.slice(0, 6))"
            :key="imgIndex"
            :src="img"
            direct-upstream
            class="content-img"
            alt=""
          />
          <div
            v-if="!expandedItems[index] && item.images.length > 3"
            class="expand-images-btn"
            @click.stop="toggleExpand(index)"
          >
            查看更多图片 (共 {{ item.images.length }} 张)
          </div>
        </div>
      </div>
    </template>
    <div class="pagination">
      <div
        v-for="p in displayPages"
        :key="p"
        class="page-btn"
        :class="{ active: p === currentPage, disabled: loading }"
        @click="!loading && goToPage(p)"
      >
        {{ p }}
      </div>
    </div>
    <div class="float-btn-group">
      <div class="float-btn" @click="scrollToNearestTitle">
        <div class="arrow-up"></div>
      </div>
      <div class="float-btn" @click="scrollToNextTitle">
        <div class="arrow-down"></div>
      </div>
      <div class="float-btn" @click="scrollToBottom">
        <div class="bottom-icon"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import request from '@/request'
import ProxyImg from '@/components/ProxyImg.vue'
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'

interface ContentItem {
  title: string
  text: string
  url: string
  images: string[]
}

const contentList = ref<ContentItem[]>([])
const loading = ref(false)
const expandedItems = ref<Record<number, boolean>>({})

const getInitialPage = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const page = parseInt(urlParams.get('page') || '1', 10)
  return Number.isNaN(page) || page < 1 ? 1 : page
}

const currentPage = ref(getInitialPage())

const updateURL = (page: number) => {
  const url = new URL(window.location.href)
  url.searchParams.set('page', page.toString())
  window.history.pushState({}, '', url.toString())
}

const handlePopState = () => {
  currentPage.value = getInitialPage()
  fetchData()
}

onMounted(() => {
  window.addEventListener('popstate', handlePopState)
  fetchData()
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
})

watch(currentPage, (newPage) => {
  updateURL(newPage)
})

const displayPages = computed(() => {
  const pages: number[] = []
  if (currentPage.value > 1) {
    pages.push(1)
  }
  for (let i = currentPage.value; i <= currentPage.value + 5; i++) {
    pages.push(i)
  }
  return pages
})

const fetchData = async () => {
  loading.value = true
  const urlParams = new URLSearchParams(window.location.search)
  const page = urlParams.get('page') || '1'
  try {
    const response = await request(`/bus?page=${page}`)
    contentList.value = response
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

const goToPage = (page: number) => {
  if (loading.value) return
  currentPage.value = page
  updateURL(page)
  fetchData()
}

const toggleExpand = (index: number) => {
  if (!expandedItems.value[index]) {
    expandedItems.value[index] = true
  }
}

const smoothScrollTo = (targetY: number) => {
  const startY = window.scrollY || window.pageYOffset
  const difference = targetY - startY
  const speed = 600
  const duration = (Math.abs(difference) / speed) * 1000

  const startTime = performance.now()
  let isInterrupted = false

  const interruptHandler = () => {
    isInterrupted = true
    cleanup()
  }

  const cleanup = () => {
    window.removeEventListener('wheel', interruptHandler)
    window.removeEventListener('touchmove', interruptHandler)
  }

  window.addEventListener('wheel', interruptHandler, { passive: true })
  window.addEventListener('touchmove', interruptHandler, { passive: true })

  const step = (currentTime: number) => {
    if (isInterrupted) return

    const progress = Math.min((currentTime - startTime) / duration, 1)
    window.scrollTo(0, startY + difference * progress)

    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      cleanup()
    }
  }

  requestAnimationFrame(step)
}

const titleAnchors = () =>
  Array.from(document.querySelectorAll('.content-item .content-header a.text-l')) as HTMLAnchorElement[]

const scrollToNearestTitle = () => {
  const aTags = titleAnchors()
  const currentScroll = window.scrollY || window.pageYOffset
  let target: HTMLAnchorElement | null = null
  for (let i = aTags.length - 1; i >= 0; i--) {
    const rect = aTags[i].getBoundingClientRect()
    const absoluteTop = rect.top + window.scrollY
    if (absoluteTop < currentScroll - 20) {
      target = aTags[i]
      break
    }
  }

  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else if (aTags.length > 0 && currentScroll > 20) {
    aTags[0].scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const scrollToNextTitle = () => {
  const aTags = titleAnchors()
  const currentScroll = window.scrollY || window.pageYOffset
  const viewportHeight = window.innerHeight

  let target: HTMLAnchorElement | null = null
  let targetTop = 0
  for (let i = 0; i < aTags.length; i++) {
    const rect = aTags[i].getBoundingClientRect()
    const absoluteTop = rect.top + currentScroll
    if (absoluteTop > currentScroll + 20) {
      target = aTags[i]
      targetTop = absoluteTop
      break
    }
  }

  if (target) {
    smoothScrollTo(targetTop)
  } else {
    const scrollHeight = document.documentElement.scrollHeight
    if (currentScroll + viewportHeight < scrollHeight - 50) {
      smoothScrollTo(Math.min(currentScroll + viewportHeight, scrollHeight - viewportHeight))
    } else {
      goToPage(currentPage.value + 1)
    }
  }
}

const scrollToBottom = () => {
  const scrollHeight = document.documentElement.scrollHeight
  const viewportHeight = window.innerHeight
  smoothScrollTo(scrollHeight - viewportHeight)
}
</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family:
    PingFang SC,
    HarmonyOS_Regular,
    Helvetica Neue,
    Microsoft YaHei,
    sans-serif !important;
}
.bus-container {
  padding: 20px;
}

.content-item {
  margin-bottom: 30px;
}

.content-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.text {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 15px;
}

.img-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: flex-start;
  position: relative;
}

.expand-images-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 120px;
  background-color: #f0f2f5;
  border-radius: 8px;
  color: #1890ff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  border: 1px dashed #1890ff;
}

.expand-images-btn:hover {
  background-color: #e6f7ff;
  border-style: solid;
}

.content-img {
  max-width: min(800px, 90vw);
  max-height: min(800px, 160vh);
  object-fit: contain;
  border-radius: 8px;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.page-btn {
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
}

.page-btn:hover {
  background: #e8e8e8;
}

.page-btn.active {
  background: #1890ff;
  color: white;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.loading-text {
  color: #666;
  font-size: 14px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.page-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-wrapper {
  position: relative;
  max-height: 80px;
  overflow: hidden;
  cursor: pointer;
  transition: max-height 0.3s ease;
}

.text-wrapper.expanded {
  max-height: none;
}

.text-wrapper:not(.expanded)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(transparent, #fff);
  pointer-events: none;
}

.expand-btn {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  color: #1890ff;
  z-index: 1;
}

.text {
  margin: 0;
  padding: 0;
}

.float-btn-group {
  position: fixed;
  right: 20px;
  bottom: 80px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  z-index: 1000;
}

.float-btn {
  width: 44px;
  height: 44px;
  background-color: #1890ff;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s ease;
}

.float-btn:hover {
  background-color: #40a9ff;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.arrow-up {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 10px solid white;
}

.arrow-down {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 10px solid white;
}

.bottom-icon {
  position: relative;
  width: 14px;
  height: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.bottom-icon::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid white;
  margin-bottom: 2px;
}

.bottom-icon::after {
  content: '';
  width: 14px;
  height: 2px;
  background-color: white;
}
</style>
