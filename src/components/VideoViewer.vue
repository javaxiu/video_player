<template>
  <div>
    <!-- 初始化渲染img标签 -->
    <div class="preview" v-if="isImg">
      <div class="mask">
        <div class="file-title">{{ props.url.split('/').pop() }}</div>
        <div class="buttons">
          <div :class="forward > 0 ? '' : 'disabled'" @click="reloadPreview(0, -10)" class="btn">⏪</div>
          <div :class="forward < 100 ? '' : 'disabled'" @click="reloadPreview(0, 10)" class="btn">⏩</div>
          <div @click="reloadPreview()" class="btn">🔎</div>
          <div @click="toggleMedia" class="btn">🎦</div>
        </div>
      </div>
      <img :src="previewUrl" class="img" :alt="url" @error="reloadPreview(1000)">
    </div>
    <div v-if="!isImg" @click="dropMedia" class="btn">🗑️删除视频</div>
    <!-- 点击后渲染video标签 -->
    <video v-if="!isImg" :src="props.url" controls @click="toggleMedia" class="video"></video>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps<{
  url: string;
}>();

const emit = defineEmits(['dropDone']);

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

const dropMedia = () => {
  isImg.value = true;
  if (!confirm(`删除${props.url}`)) {
    return;
  }
  const deleteUrl = props.url;
  window.history.back();
  setTimeout(() => {    
    fetch(`http://${window.location.hostname}:3000/drop`, {
      method: 'post',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: deleteUrl,
      })
    }).then(() => {
      emit('dropDone', deleteUrl);
    });
  }, 300);
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
    .file-title {
      background-color: rgba(0, 0, 0, .5);
      line-height: 30px;
      text-indent: 12px;
      color: #fff;
      z-index: 0;
    }

    .buttons {
      position: absolute;
      z-index: 1;
      top: 0;
      right: 0;
      .btn {
        font-size: 20px;
        display: inline-block;
        margin-left: 10px;
      }
      .disabled {
        color: #ccc;
        opacity: .5;
        cursor: not-allowed;
      }
    }
  }
}
</style>