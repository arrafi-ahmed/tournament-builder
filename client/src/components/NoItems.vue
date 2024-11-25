<script setup>
const { justify, text, variant, cols, sm, md, lg, xl, closable, customClass } =
  defineProps({
    justify: { type: String, default: "center" },
    text: { type: String, default: "No items found!" },
    variant: { type: String, default: "tonal" },
    cols: { type: Number, default: 12 },
    sm: { type: Number },
    md: { type: Number },
    lg: { type: Number },
    xl: { type: Number },
    closable: { type: Boolean, default: true },
    customClass: { type: String, default: "text-center" },
  });
</script>

<template>
  <v-container>
    <v-row :class="`${customClass} text-wrap`" :justify="justify">
      <v-col :cols="cols" :sm="sm" :md="md" :lg="lg" :xl="xl">
        <v-alert
          :text="text"
          :variant="variant"
          :closable="closable"
          density="compact"
          icon="mdi-information-outline"
        ></v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
