<template>
  <div class="warm-container">
    <ProxyImg 
      v-for="item in thumbnailList" 
      :src="item.thumbnail" 
      :key="item.original"
      class="warm-item"
      alt=""
      @click="handleImageClick(item.original)"
    />
    <!-- 全屏预览层 -->
    <div v-if="showPreview" class="preview-container">
      <ProxyImg :src="currentImage" alt="" class="preview-image" />
      <div class="button-container">
        <button class="view-button" @click="openInNewWindow">查看</button>
        <button class="close-button" @click="closePreview">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ProxyImg from '@/components/ProxyImg.vue';
import request from '@/request';
import { padStart } from 'lodash';
import { onMounted, ref } from 'vue';

interface ImageItem {
  thumbnail: string;
  original: string;
}

const thumbnailList = ref<ImageItem[]>([]);

onMounted(async () => {
  const u = new URL(location.href);
  const r = `/albums/list${u.search}`;
  console.log(r);
  request(r).then(res => {
    thumbnailList.value = new Array(res.total).fill(0).map((item, index) => {
      const originalUrl = `${res.src}${padStart(String(index + 1), 4, '0')}.jpg`;
      const thumbnailUrl = originalUrl.replace('.jpg', '_120x0.webp');
      return {
        thumbnail: thumbnailUrl,
        original: originalUrl
      };
    });
    console.log(thumbnailList.value);
  });
});

const showPreview = ref(false);
const currentImage = ref('');

// 点击图片预览函数
const handleImageClick = (url: string) => {
  currentImage.value = url;
  showPreview.value = true;
};

// 关闭预览函数
const closePreview = () => {
  showPreview.value = false;
};

// 在新窗口打开图片
const openInNewWindow = () => {
  window.open(currentImage.value, '_blank');
};
</script>

<style scoped>
.warm-container {
  display: grid;
  grid-template-columns: repeat(auto-fill,  28vw);
  gap: 10px;
  padding: 10px;
}

.warm-container .warm-item {
  width:  28vw;
  height:  28vw;
  object-fit: cover;
  cursor: pointer;
}

.preview-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.preview-image {
  width: 100vw;
  object-fit: contain;
}

.button-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 1001;
}

.close-button,
.view-button {
  padding: 10px 30px;
  background-color: #ffffff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  word-break: keep-all;
}

.close-button:hover,
.view-button:hover {
  background-color: #f0f0f0;
}
</style>
