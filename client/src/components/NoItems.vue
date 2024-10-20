<script setup>
const { title, subTitle, justify, customClass } = defineProps({
  justify: { type: String, default: "center" },
  text: { type: String, default: "No items found!" },
  variant: { type: String, default: "tonal" },
  cols: { type: Number, default: 4 },
  customClass: { type: String, default: "text-center" },
});
</script>

<template>
  <v-container>
    <v-row :class="`${customClass} text-wrap`" :justify="justify">
      <v-col :cols="cols">
        <v-alert
          :text="text"
          :variant="variant"
          closable
          density="compact"
          icon="mdi-information-outline"
        ></v-alert>
      </v-col>
    </v-row>
  </v-container>
  <!--  <v-divider class="my-2"></v-divider>-->
</template>

<style scoped></style>
