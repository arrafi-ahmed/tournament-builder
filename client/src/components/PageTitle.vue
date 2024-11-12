<script setup>
import { useRouter } from "vue-router";
import { computed } from "vue";

const router = useRouter();
const {
  title,
  subTitle,
  justify,
  customClass,
  showBack,
  borderB,
  prependAvatar,
  backRoute,
} = defineProps({
  title: { type: String },
  subTitle: { type: String },
  justify: { type: String, default: "space-between" },
  customClass: { type: String },
  showBack: { type: Boolean, default: false },
  borderB: { type: Boolean, default: false },
  prependAvatar: { type: String, default: null },
  backRoute: { type: Object, default: null },
});
const calcShowBack = computed(() => {
  return showBack || (backRoute && !showBack);
});

const handleBackClick = () => {
  if (backRoute) {
    router.push(backRoute);
  } else {
    router.back();
  }
};
</script>

<template>
  <v-row :class="customClass" :justify="justify" align="center" no-gutters>
    <v-col class="d-flex align-center" cols="9">
      <v-btn
        v-if="calcShowBack"
        class="mr-1"
        icon="mdi-chevron-left"
        size="md"
        style="font-size: xx-large"
        variant="text"
        @click="handleBackClick"
      >
      </v-btn>
      <div class="d-flex align-center">
        <v-avatar
          v-if="prependAvatar"
          :image="prependAvatar"
          rounded
          size="60"
          class="mr-2"
        ></v-avatar>
        <div>
          <div v-if="subTitle" class="text-overline">{{ subTitle }}</div>
          <h2 v-if="title">{{ title }}</h2>
        </div>
      </div>
    </v-col>
    <v-col cols="auto">
      <slot></slot>
    </v-col>
  </v-row>
  <v-divider v-if="borderB" class="my-2"></v-divider>
</template>

<style scoped></style>
