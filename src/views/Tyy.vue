<template>
  <div class="tyy-container">
    <div v-if="loading || contentList.length === 0" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>
    <template v-else>
      <div v-for="(item, index) in contentList" :key="index" class="content-item">
        <div class="content-header">
          <button v-if="item.authorid" class="author-btn" @click="filterByAuthor(item.authorid)">
            作者ID: {{ item.authorid }}
          </button>
          <span v-if="item.timestamp" class="post-time">{{ formatTimestamp(item.timestamp) }}</span>
          <a :href="`${item.url}`" target="_blank" class="text-l text-black">{{ item.title }}</a>
        </div>
        <div class="text-wrapper" :class="{ expanded: expandedItems[index] }" @click="toggleExpand(index)">
          <pre class="text text-gray-600">{{ item.text }}</pre>
          <div class="expand-btn" v-if="!expandedItems[index]">展开全文</div>
        </div>
        <div class="img-container">
          <img 
            v-for="(img, imgIndex) in (expandedItems[index] ? item.images : item.images.slice(0, 6))" 
            :key="imgIndex"
            :src="img"
            class="content-img"
            alt="图片"
          />
          <div 
            v-if="!expandedItems[index] && item.images.length > 3" 
            class="expand-images-btn" 
            @click="toggleExpand(index)"
          >
            查看更多图片 (共 {{ item.images.length }} 张)
          </div>
        </div>
      </div>
    </template>
    <div class="pagination">
      <div 
        v-for="page in displayPages" 
        :key="page"
        class="page-btn"
        :class="{ active: page === currentPage, disabled: loading }"
        @click="!loading && goToPage(page)"
      >
        {{ page }}
      </div>
    </div>
    <div class="float-btn-group">
      <div class="float-btn" @click="scrollToNearestA">
        <div class="arrow-up"></div>
      </div>
      <div class="float-btn" @click="scrollToNextA">
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
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'

interface ContentItem {
  title: string
  text: string
  url: string
  images: string[]
  authorid?: string
  timestamp?: number
}

const contentList = ref<ContentItem[]>([])
const loading = ref(false)
const expandedItems = ref<Record<number, boolean>>({})

// 从 URL 获取初始页码
const getInitialPage = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const page = parseInt(urlParams.get('page') || '1')
  return isNaN(page) ? 2 : page
}

// 从 URL 获取初始作者 ID
const getInitialAuthorId = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('authorid') || ''
}

const currentPage = ref(getInitialPage())
const currentAuthorId = ref(getInitialAuthorId())

// 更新 URL
const updateURL = (page: number, authorid: string) => {
  const url = new URL(window.location.href)
  url.searchParams.set('page', page.toString())
  if (authorid) {
    url.searchParams.set('authorid', authorid)
  } else {
    url.searchParams.delete('authorid')
  }
  window.history.pushState({}, '', url.toString())
}

// 监听浏览器前进后退
const handlePopState = () => {
  currentPage.value = getInitialPage()
  currentAuthorId.value = getInitialAuthorId()
  fetchData()
}

onMounted(() => {
  window.addEventListener('popstate', handlePopState)
  fetchData()
})

// 在组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
})

// 监听页码变化并更新 URL
watch(currentPage, (newPage) => {
  updateURL(newPage, currentAuthorId.value)
})

// 监听作者 ID 变化并更新 URL
watch(currentAuthorId, (newAuthorId) => {
  updateURL(currentPage.value, newAuthorId)
})

const displayPages = computed(() => {
  const pages = []
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
  // 从 URL 读取最新的 query 参数
  const urlParams = new URLSearchParams(window.location.search)
  const page = urlParams.get('page') || '1'
  const authorid = urlParams.get('authorid') || ''
  
  try {
    let url = `/tyy?id=${page}`
    if (authorid) {
      url += `&authorid=${authorid}`
    }
    const response = await request(url)
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
  // updateURL 会被 watch 触发，但我们需要手动调用 fetchData 以响应点击
  updateURL(page, currentAuthorId.value)
  fetchData()
}

const filterByAuthor = (authorid: string) => {
  if (loading.value) return
  currentAuthorId.value = authorid
  currentPage.value = 1
  updateURL(1, authorid)
  fetchData()
}

const toggleExpand = (index: number) => {
  if (!expandedItems.value[index]) {
    expandedItems.value[index] = true
    return
  }
}

const formatTimestamp = (ts?: number) => {
  if (!ts) return ''
  const date = new Date(ts * 1000)
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  return `${m}-${d} ${h}:${min}`
}

const smoothScrollTo = (targetY: number) => {
  const startY = window.scrollY || window.pageYOffset
  const difference = targetY - startY
  // 设置速度为每秒固定 600px
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
    // 匀速滚动，直接使用 progress
    window.scrollTo(0, startY + difference * progress)
    
    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      cleanup()
    }
  }

  requestAnimationFrame(step)
}

const scrollToNearestA = () => {
  // 向上滚动到最近的一个 a 标签
  const aTags = Array.from(document.querySelectorAll('.content-item > a.text-l')) as HTMLAnchorElement[]
  const currentScroll = window.scrollY || window.pageYOffset
  
  // 查找在当前滚动位置之上的最后一个 a 标签
  // 增加 20px 的偏移量，以便在已经靠近某个 a 标签时，点击能滚到更上面的一个
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
    // 如果没有找到更上面的 a 标签，但当前不在顶部，则滚动到第一个 a 标签
    aTags[0].scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else {
    // 否则滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const scrollToNextA = () => {
  // 向下滚动到下一个 a 标签
  const aTags = Array.from(document.querySelectorAll('.content-item > a.text-l')) as HTMLAnchorElement[]
  const currentScroll = window.scrollY || window.pageYOffset
  const viewportHeight = window.innerHeight
  
  // 查找在当前滚动位置之下的第一个 a 标签
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
    // 去掉最多滚动一屏的限制，直接滚动到目标 a 标签
    smoothScrollTo(targetTop)
  } else {
    // 如果没有下一个 a 标签
    const scrollHeight = document.documentElement.scrollHeight
    // 如果还没到底部（留 50px 的余量），先向下滚动一屏
    if (currentScroll + viewportHeight < scrollHeight - 50) {
      smoothScrollTo(Math.min(currentScroll + viewportHeight, scrollHeight - viewportHeight))
    } else {
      // 已经到底部了，跳转到下一页
      goToPage(currentPage.value + 1)
    }
  }
}

const scrollToBottom = () => {
  // 滚动到页面底部
  const scrollHeight = document.documentElement.scrollHeight
  const viewportHeight = window.innerHeight
  smoothScrollTo(scrollHeight - viewportHeight)
}
</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: PingFang SC,HarmonyOS_Regular,Helvetica Neue,Microsoft YaHei,sans-serif!important;
}
.tyy-container {
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

.author-btn {
  background-color: #f0f5ff;
  border: 1px solid #adc6ff;
  color: #1d39c4;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.author-btn:hover {
  background-color: #1d39c4;
  color: white;
  border-color: #1d39c4;
}

.post-time {
  font-size: 12px;
  color: #8c8c8c;
  background-color: #fafafa;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
