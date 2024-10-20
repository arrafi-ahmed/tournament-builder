<script setup>
import { ref } from "vue";

const drawer = ref(true);
const rail = ref(true);
</script>

<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    @click="rail = false"
  >
    <v-list-item nav>
      <template v-slot:append>
        <v-btn
          :icon="`mdi-chevron-${rail ? 'right' : 'left'}`"
          class="mt-1"
          density="comfortable"
          variant="text"
          @click.stop="rail = !rail"
        ></v-btn>
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
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped></style>
