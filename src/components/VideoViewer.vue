<template>
  <div>
    <!-- 初始化渲染img标签 -->
    <div class="preview" v-if="isImg">
      <img :src="previewUrl" class="img" :alt="url" @error="reloadPreview(1000)">
      <div class="mask">
        <div class="buttons">
          <div v-if="forward > 0" @click="reloadPreview(0, -10)" class="btn">⏪</div>
          <div v-if="forward < 100" @click="reloadPreview(0, 10)" class="btn">⏩</div>
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

const api = `http://${window.location.hostname}:3000/thumbnail?v=`;

const previewUrl = ref(api + encodeURIComponent(props.url));

const isImg = ref(true);
const toggleMedia = () => {
  isImg.value = !isImg.value;
};
let retryCount = 0;
let forward = ref(0);
const reloadPreview = (wait = 0, forwardStep = 1) => {
  if (wait > 0) {
    if (retryCount > 2) {
      return;
    }
    retryCount++;
    setTimeout(reloadPreview, wait);
  } else {
    forward.value += forwardStep;
    if (forward.value >= 100 || forward.value <= 0) {
      return;
    }
    previewUrl.value = api + encodeURIComponent(props.url) + '&f=' + forward.value;
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
        font-size: 20px;
      }
    }
  }
}
</style>