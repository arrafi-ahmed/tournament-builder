<script setup>
import { useStore } from "vuex";
import { useRouter } from "vue-router";

definePage({
  name: "public",
  meta: {
    layout: "default",
  },
});
const store = useStore();
const router = useRouter();

router.push({ name: "not-found", params: { catchAll: "p" } });
</script>

<template></template>

<style scoped></style>
