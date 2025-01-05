<template>
  <div>
    <!-- 初始化渲染img标签 -->
    <div class="preview" v-if="isImg">
      <img :src="previewUrl" class="img" :alt="url" @error="reloadPreview(1000)">
      <div class="mask">
        <div class="buttons">
          <div @click="reloadPreview()" class="btn">🔎</div>
          <div @click="toggleMedia" class="btn">🎦</div>
        </div>
      </div>
    </div>
    <!-- 点击后渲染video标签 -->
    <video v-if="!isImg" :src="props.url" controls @click="toggleMedia" class="video"></video>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps<{
  url: string;
}>();

const previewUrl = ref('http://localhost:3000/thumbnail?v=' + props.url);

const isImg = ref(true);
const toggleMedia = () => {
  isImg.value = !isImg.value;
};
let retryCount = 0;
const reloadPreview = (wait = 0) => {
  if (wait > 0) {
    if (retryCount > 2) {
      return;
    }
    retryCount++;
    setTimeout(reloadPreview, wait);
  } else {
    previewUrl.value = 'http://localhost:3000/thumbnail?v=' + props.url + '&t=' + Date.now();
  }
}

</script>

<style scss>
/* 可以添加组件的样式 */
.video,
.img {
  width: 100%;
}

.preview {
  position: relative;
  min-height: 100px;

  .mask {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;

    .buttons {
      position: absolute;
      top: 0;
      right: 0;
      display: flex;
      justify-items: center;
      align-items: center;
      gap: 10px;

      .btn {
        font-size: 40px;
      }
    }
  }
}
</style>