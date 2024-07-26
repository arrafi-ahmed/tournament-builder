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
  <v-row :justify="justify" :class="customClass">
    <v-col :cols="cols">
      <v-alert
        closable
        icon="mdi-information-outline"
        :text="text"
        :variant="variant"
      ></v-alert>
    </v-col>
  </v-row>
  <!--  <v-divider class="my-2"></v-divider>-->
</template>

<style scoped></style>
