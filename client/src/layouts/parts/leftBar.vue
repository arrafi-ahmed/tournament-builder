<script setup>
import { ref } from "vue";
import { useDisplay } from "vuetify";

const drawer = ref(true);
const { xs } = useDisplay();
</script>

<template>
  <v-navigation-drawer
    v-model="drawer"
    rail
    permanent
    :expand-on-hover="!xs"
    touchless
  >
    <v-list-item nav>
      <template v-slot:append>
        <v-btn class="mt-1" variant="text" disabled></v-btn>
      </template>
    </v-list-item>

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <v-list-item
        :to="{
          name: 'tournament-settings',
          params: { tournamentId: $route.params.tournamentId },
        }"
        prepend-icon="mdi-cog"
        title="Settings"
        value="settings"
      ></v-list-item>
      <v-list-item
        :to="{
          name: 'tournament-participants',
          params: { tournamentId: $route.params.tournamentId },
        }"
        prepend-icon="mdi-tshirt-crew"
        title="Participants"
        value="participants"
      ></v-list-item>
      <v-list-item
        :to="{
          name: 'tournament-format',
          params: { tournamentId: $route.params.tournamentId },
        }"
        prepend-icon="mdi-tournament"
        title="Format"
        value="format"
      ></v-list-item>
      <v-list-item
        :to="{
          name: 'tournament-schedule',
          params: { tournamentId: $route.params.tournamentId },
        }"
        prepend-icon="mdi-calendar-clock"
        title="Schedule"
        value="schedule"
      ></v-list-item>
      <v-list-item
        :to="{
          name: 'tournament-result',
          params: { tournamentId: $route.params.tournamentId },
        }"
        prepend-icon="mdi-graph"
        title="Result"
        value="result"
      ></v-list-item>
      <v-list-item
        :to="{
          name: 'tournament-standing',
          params: { tournamentId: $route.params.tournamentId },
        }"
        prepend-icon="mdi-table-arrow-up"
        title="Standing"
        value="standing"
      ></v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped></style>
