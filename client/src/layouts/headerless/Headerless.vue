<script setup>
import DefaultFooter from "@/layouts/commons/Footer.vue";
</script>

<template>
  <v-app>
    <v-main>
      <div class="fill-height">
        <router-view />
      </div>
    </v-main>
    <default-footer />
  </v-app>
</template>

<style></style>
