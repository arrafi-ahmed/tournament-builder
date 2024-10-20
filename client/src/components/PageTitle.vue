<script setup>
const { title, subTitle, justify, customClass, showBack, borderB, routeName } =
  defineProps({
    title: { type: String },
    subTitle: { type: String },
    justify: { type: String, default: "space-between" },
    customClass: { type: String },
    showBack: { type: Boolean, default: false },
    borderB: { type: Boolean, default: false },
    routeName: { type: Function },
  });
</script>

<template>
  <v-row :class="customClass" :justify="justify" align="center" no-gutters>
    <v-col class="d-flex align-center" cols="9">
      <v-btn
        v-if="showBack"
        class="mr-1"
        icon="mdi-chevron-left"
        size="md"
        style="font-size: xx-large"
        variant="text"
        @click="routeName || $router.back()"
      >
      </v-btn>
      <div>
        <div v-if="subTitle" class="text-overline">{{ subTitle }}</div>
        <h2 v-if="title">{{ title }}</h2>
      </div>
    </v-col>
    <v-col cols="auto">
      <slot></slot>
    </v-col>
  </v-row>
  <v-divider v-if="borderB" class="my-2"></v-divider>
</template>

<style scoped></style>
