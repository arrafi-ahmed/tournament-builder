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
    <v-col cols="9" class="d-flex align-center">
      <v-btn
        v-if="showBack"
        class="mr-1"
        style="font-size: xx-large"
        variant="text"
        size="md"
        icon="mdi-chevron-left"
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
