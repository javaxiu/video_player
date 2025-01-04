<template>
  <img v-for="(img, index) in images" :src="img" :key="index" />
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  const images = ref([]);
  fetch(`http://${window.location.hostname}:3000/img`).then(r => r.json()).then(list => {
    console.log(list);
    images.value = list;
  })
</script>

<style>
img {
  width: 100vw;
}
</style>
