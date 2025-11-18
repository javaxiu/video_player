<template>
  <img v-bind="$attrs" :src="isVisible ? proxyUrl : ''" ref="imgRef" />
</template>

<script setup lang="ts">
import { prefix } from '@/request';
import { computed, ref, onMounted, onUnmounted } from 'vue'

// 继承所有 img 标签原生属性
const props = defineProps<{
  src?: string
}>()

const imgRef = ref<HTMLImageElement | null>(null)
const isVisible = ref(false)

// 计算代理后的URL
const proxyUrl = computed(() => {
  if (!props.src) return ''
  // 相对路径则先转为绝对路径
  return prefix + '/img-proxy?url=' + props.src
})

// 使用 IntersectionObserver 检测元素是否可见
const observer = ref<IntersectionObserver | null>(null)

// 观察器回调函数
const observerCallback = (entries: IntersectionObserverEntry[]) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      isVisible.value = true
      // 一旦加载完成后，取消观察
      observer.value?.unobserve(entry.target)
    }
  })
}

onMounted(() => {
  // 创建观察器实例
  observer.value = new IntersectionObserver(observerCallback, {
    root: null, // 使用视口作为根
    rootMargin: '50px', // 提前50px开始加载
    threshold: 0.1 // 当元素10%可见时触发
  })

  // 开始观察目标元素
  if (imgRef.value) {
    observer.value.observe(imgRef.value)
  }
})

onUnmounted(() => {
  // 清理观察器
  observer.value?.disconnect()
})
</script>
