<template>
  <div class="warm-cover">
    <!-- 页面内容区域 -->
    <div class="cover-list">
      <div 
        v-for="item in covers" 
        :key="item.id" 
        class="list-item"
        @click="goToDetail(item)"
      >
        <div class="item-container">
          <ProxyImg :src="item.cover" :alt="item.name" class="item-thumbnail" />
          <div class="item-name">{{ item.name }}</div>
        </div>
      </div>
    </div>
    <!-- 添加下一页按钮 -->
    <div 
      class="next-page-btn" 
      :class="{ 'loading': isLoading }"
      @click="loadNextPage"
    >
      {{ isLoading ? '加载中...' : '下一页' }}
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import request from '@/request'
import ProxyImg from '@/components/ProxyImg.vue'

const router = useRouter()
const route = useRoute()
const covers = ref<{ id: string, name: string, cover: string, url: string }[]>([])
const currentPage = ref(Number(route.query.page) || 3) // 从URL参数读取页码，默认为3
const isLoading = ref(false)

// 跳转到详情页
const goToDetail = (id: any) => {
  const u = new URL('https://xchina.biz/');
  u.pathname = id.url;
  router.push(`/warm-detail?url=${u.toString()}`)
}

// 加载数据
const loadData = async (page: number) => {
  isLoading.value = true
  try {
    const list = await request(`/albums?url=https://xchina.biz/amateurs/${page}.html`)
    covers.value = list;
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 加载下一页
const loadNextPage = () => {
  if (isLoading.value) return
  currentPage.value++
  // 更新URL参数
  window.history.pushState(
    {}, 
    '', 
    `${window.location.pathname}?page=${currentPage.value}`
  )
  loadData(currentPage.value)
}

onMounted(async () => {
  await loadData(currentPage.value)
})
</script>


<style scoped>
.cover-list {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.list-item {
  cursor: pointer;
}

.item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s;
}

.item-container:hover {
  transform: scale(1.05);
}

.item-thumbnail {
  width: 100%;
  /* 保持1:1的宽高比 */
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 8px;
}

.item-name {
  font-size: 14px;
  color: #333;
  margin-top: 8px;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.next-page-btn {
  margin: 20px;
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  text-align: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.next-page-btn:hover:not(.loading) {
  background-color: #45a049;
}

.next-page-btn.loading {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>
