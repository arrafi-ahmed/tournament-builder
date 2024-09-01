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
          variant="text"
          @click.stop="rail = !rail"
        ></v-btn>
      </template>
    </v-list-item>

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <v-list-item
        prepend-icon="mdi-tshirt-crew"
        title="Participants"
        value="participants"
        :to="{
          name: 'tournament-participants',
          params: { tournamentId: $route.params.tournamentId },
        }"
      ></v-list-item>
      <v-list-item
        prepend-icon="mdi-tournament"
        title="Format"
        value="format"
        :to="{
          name: 'tournament-format',
          params: { tournamentId: $route.params.tournamentId },
        }"
      ></v-list-item>
      <v-list-item
        prepend-icon="mdi-calendar-clock"
        title="Schedule"
        value="schedule"
        :to="{
          name: 'tournament-schedule',
          params: { tournamentId: $route.params.tournamentId },
        }"
      ></v-list-item>
      <v-list-item
        prepend-icon="mdi-graph"
        title="Result"
        value="result"
        :to="{
          name: 'tournament-result',
          params: { tournamentId: $route.params.tournamentId },
        }"
      ></v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped></style>
