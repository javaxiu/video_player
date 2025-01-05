<template>
  <div class="file-list-container">
    <header>
      <nav>
        <div v-for="m in ['img', 'video', 'any']" :class="[mode === m ? 'active' : '']" @click="() => mode = m">{{ m }}
        </div>
      </nav>
      <div class="up" @click="openUp">
        ◀ {{ filteredFileList.length }} / {{ fileList.length }} # {{ selectPath || '' }}
      </div>
    </header>
    <div v-if="filteredFileList.length === 0">Empty</div>
    <div v-for="(fileItem, index) in filteredFileList" :key="index" class="file">
      <div class="play-btn" v-if="fileItem.type === 'video'" @click="() => playingUrl = fileItem.path">
        🎦
        {{ fileItem.name }}
      </div>
      <video v-if="fileItem.type === 'video'" controls :src="playingUrl === fileItem.path ? fileItem.path : ''"
        class="video"></video>
      <img v-if="fileItem.type === 'img'" :src="fileItem.path" class="img" />
      <div v-if="fileItem.type === 'folder'" class="folder" @click="goDown(fileItem.path)">
        📂 {{ fileItem.timeStr }} {{ fileItem.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';

interface File {
  name: string
  suffix: string
  type: 'video' | 'img' | 'folder' | 'unknown'
  path: string,
  timeStr: string
}

let playingUrl = ref('');

let mode = ref<string>('any');
const fileList = ref<File[]>([]);
const filteredFileList = computed(() => {
  if (mode.value === 'any') {
    return fileList.value;
  }
  return fileList.value.filter(f => {
    return f.type === mode.value || f.type === 'folder';
  });
});

let selectPath = ref<string>();


const fetchVideoList = () => {
  fetch(`http://${window.location.hostname}:3000/list?sub=${selectPath.value || ''}`).then(r => r.json()).then((list: any[]) => {
    console.log(list)
    fileList.value = list;
  })
};

watch(selectPath, fetchVideoList);

onMounted(() => {
  console.log('mounting')
  fetchVideoList();
});

const goDown = (next: string) => {
  selectPath.value = next;
  history.pushState({ sub: selectPath.value }, '', '');
}

const openUp = () => {
  selectPath.value = selectPath.value?.split('/').slice(0, -1).join('/');
  history.pushState({ sub: selectPath.value }, '', '');
}

window.addEventListener('popstate', function (event) {
  if (event.state) {
    selectPath.value = event.state.sub;
  }
});

</script>

<style scoped>
header {
  position: sticky;
  top: 0;
  background-color: #fff;
}

nav {
  display: flex;
}

nav>div {
  flex: 1;
  padding: 10px;
  text-align: center;
  background-color: #f3f3f3;
}

nav>div.active {
  background-color: aliceblue;
}


.file-list-container {
  display: flex;
  flex-direction: column;
}

.file-list-container .up {
  padding: 12px 9px;
}

.file .play-btn {
  padding: 16px 0px 8px 4px;
}

.file .video,
.file .img {
  width: 100vw;
}

.file .folder {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: keep-all;
  white-space: nowrap;
  width: 100%;
  padding: 6px 0;
}
</style>