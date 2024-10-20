<script setup>
import { ref, watch } from "vue";

const model = defineModel();

const { label, customClass, density, rules, variant, showIcon } = defineProps([
  "label",
  "customClass",
  "density",
  "rules",
  "variant",
  "showIcon",
]);
const menu = ref(false);

const handleTimeChange = (newTime) => {
  model.value = newTime;
};

watch(
  () => model.value,
  (newVal) => {
    menu.value = false;
  },
);
</script>

<template>
  <v-row justify="space-around">
    <v-col>
      <v-text-field
        v-model="model"
        :active="menu"
        :class="customClass"
        :density="density"
        :focus="menu"
        :label="label"
        :prepend-inner-icon="showIcon ? 'mdi-clock-time-four-outline' : null"
        :rules="rules"
        :variant="variant"
        hide-details="auto"
        readonly
      >
        <v-menu
          v-model="menu"
          :close-on-content-click="false"
          activator="parent"
          transition="scale-transition"
        >
          <v-time-picker
            v-if="menu"
            v-model="model"
            full-width
            @update:model-value="handleTimeChange"
          ></v-time-picker>
        </v-menu>
      </v-text-field>
    </v-col>
  </v-row>
</template>

<style scoped></style>
