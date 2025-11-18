<template>
  <div class="tyy-container">
    <div v-if="loading || contentList.length === 0" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>
    <template v-else>
      <div v-for="(item, index) in contentList" :key="index" class="content-item">
        <a :href="`${item.url}`" target="_blank" class="text-l text-black">{{ item.title }}</a>
        <div class="text-wrapper" :class="{ expanded: expandedItems[index] }" @click="toggleExpand(index)">
          <pre class="text text-gray-600">{{ item.text }}</pre>
          <div class="expand-btn" v-if="!expandedItems[index]">展开全文</div>
        </div>
        <div class="img-container">
          <img 
            v-for="(img, imgIndex) in item.images" 
            :key="imgIndex"
            :src="img"
            class="content-img"
            alt="图片"
          />
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

const currentPage = ref(getInitialPage())

// 更新 URL
const updateURL = (page: number) => {
  const url = new URL(window.location.href)
  url.searchParams.set('page', page.toString())
  window.history.pushState({}, '', url.toString())
}

// 监听浏览器前进后退
const handlePopState = () => {
  currentPage.value = getInitialPage()
  fetchData(currentPage.value)
}

onMounted(() => {
  window.addEventListener('popstate', handlePopState)
  fetchData(currentPage.value)
})

// 在组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
})

// 监听页码变化并更新 URL
watch(currentPage, (newPage) => {
  updateURL(newPage)
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

const fetchData = async (page: number) => {
  loading.value = true
  // contentList.value = []
  try {
    const response = await request(`/tyy?id=${page}`)
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
  fetchData(page)
}

const toggleExpand = (index: number) => {
  if (!expandedItems.value[index]) {
    expandedItems.value[index] = true
    return
  }
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
</style>
