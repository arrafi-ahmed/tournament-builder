<script setup>
import { ref } from "vue";

const dialog = ref(false);

const { message, label, color } = defineProps({
  message: { default: "Are you sure?" },
  label: { default: "Remove" },
  color: { default: "error" },
});

const emit = defineEmits(["confirm"]);

const onClick = () => {
  dialog.value = true;
};

const confirmAction = () => {
  emit("confirm");
  dialog.value = false;
};
</script>

<template>
  <!-- Slot for activator button -->
  <slot name="activator" :onClick="onClick"></slot>

  <!-- Confirmation dialog -->
  <v-dialog v-model="dialog" width="400">
    <v-card>
      <v-card-title>
        <span>{{ label }}</span>
      </v-card-title>
      <v-card-text>{{ message }}</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn :color="color" @click="confirmAction">Yes</v-btn>
        <v-btn :color="color" @click="dialog.value = false">No</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
