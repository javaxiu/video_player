<template>
  <div class="file-list-container">
    <header>
      <nav>
        <div v-for="m in ['img', 'video', 'media', 'any']" :class="[mode === m ? 'active' : '']" @click="() => mode = m">{{ m }}
        </div>
      </nav>
      <div class="btn btn-primary" @click="clearEmpty">删除空文件夹</div>
      <div class="up" @click="openUp">
        ◀ {{ filteredFileList.length }} / {{ fileList.length }} # {{ selectPath || '' }}
      </div>
    </header>
    <div v-if="filteredFileList.length === 0">Empty</div>
    <div class="btn btn-primary mb-2" @click="dropFolder">🗑️♻️</div>
    <div v-for="(fileItem, index) in filteredFileList" :key="index" class="file">
      <VideoViewer v-if="fileItem.type === 'video'" :url="fileItem.path" @drop-done="fetchVideoList"></VideoViewer>
      <img v-if="fileItem.type === 'img'" :src="fileItem.path" class="img" />
      <div v-if="fileItem.type === 'folder'" class="folder" @click="goDown(fileItem.path)">
        📂 {{ fileItem.name }}
        <div class="text-gray-400 text-sm pl-7">{{ fileItem.timeStr }}</div>
      </div>
      <div v-if="mode === 'any' && fileItem.type === 'unknown'" class="folder">❓{{ fileItem.name }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import VideoViewer from '@/components/VideoViewer.vue';

interface File {
  name: string
  suffix: string
  type: 'video' | 'img' | 'folder' | 'unknown'
  path: string,
  timeStr: string
}

const mode = ref<string>('any');
const fileList = ref<File[]>([]);
const filteredFileList = computed(() => {
  if (mode.value === 'any') {
    return fileList.value;
  }
  if (mode.value === 'media') {
    return fileList.value.filter(f => {
      return f.type !== 'unknown';
    });
  }
  return fileList.value.filter(f => {
    return f.type === mode.value || f.type === 'folder';
  });
});

const selectPath = ref<string>(history.state.sub || '');


const fetchVideoList = () => {
  const apiUrl = new URL(`http://${window.location.hostname}:3000/list`);
  apiUrl.searchParams.set('sub', selectPath.value || '');
  fetch(apiUrl.toString()).then(r => r.json()).then((list: any[]) => {
    fileList.value = list;
  })
};

watch(selectPath, fetchVideoList);

onMounted(() => {
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

const dropFolder = () => {
  if (!confirm(`删除${selectPath.value}`)) {
    return;
  }
  console.log(selectPath.value);
  const dropPath = selectPath.value;
  openUp();
  setTimeout(() => {    
    fetch(`http://${window.location.hostname}:3000/drop`, {
      method: 'post',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: dropPath,
      })
    });
  }, 300);
}

const clearEmpty = () => {
  if (!confirm(`删除${selectPath.value}下的空文件夹`)) {
    return;
  }
  fetch(`http://${window.location.hostname}:3000/clear`, {
    method: 'post',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      path: selectPath.value,
      clearEmpty: true,
    })
  });
}

window.addEventListener('popstate', function (event) {
  if (event.state?.sub) {
    selectPath.value = event.state.sub;
  }
});

</script>

<style scoped>
header {
  position: sticky;
  top: 0;
  z-index: 99;
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