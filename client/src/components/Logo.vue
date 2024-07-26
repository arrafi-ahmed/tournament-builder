<script setup>
import { useDisplay } from "vuetify";
import { appInfo, getClientPublicImgUrl } from "@/others/util";
import { computed } from "vue";

const { mobile } = useDisplay();
const { imgSrc, title, imgClass, containerClass, maxWidth, width } =
  defineProps([
    "imgSrc",
    "title",
    "imgClass",
    "containerClass",
    "maxWidth",
    "width",
  ]);
</script>

<template>
  <div :class="`d-flex align-center ${containerClass}`">
    <v-img
      v-if="imgSrc"
      :src="getClientPublicImgUrl(imgSrc)"
      :class="` ${imgClass}`"
      :max-width="maxWidth"
      :width="width"
    ></v-img>

    <div v-if="title" class="pl-2">
      <component :is="mobile ? 'h3' : 'h2'">
        <span class="text-primary">{{ appInfo.name }}</span>
      </component>
    </div>
  </div>
</template>

<style scoped></style>
