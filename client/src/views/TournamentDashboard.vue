<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import PageTitle from "@/components/PageTitle.vue";
import { useStore } from "vuex";

const store = useStore();
const route = useRoute();
const router = useRouter();

const fetchData = () => {
  if (shouldFetchData.value) {
    store.dispatch("tournament/setTournament", {
      tournamentId: route.params.tournamentId,
    });
  }
};
const targetTournamentId = computed(() => route.params.tournamentId);
const prefetchedTournament = computed(() =>
  store.getters["tournament/getTournamentById"](targetTournamentId.value)
);
const shouldFetchData = computed(() => !prefetchedTournament.value?.id);
const tournament = computed(() =>
  shouldFetchData.value
    ? store.state.tournament.tournament
    : prefetchedTournament.value
);

onMounted(() => {
  fetchData();
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          justify="space-between"
          :sub-title="tournament.name"
          title="Dashboard"
          show-back
        >
        </page-title>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col>
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'team-edit',
            })
          "
        >
          <v-card-text class="text-center"><h2>Team</h2></v-card-text>
        </v-card>
      </v-col>
      <v-col>
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'team-squad',
            })
          "
        >
          <v-card-text class="text-center"><h2>Add Member</h2></v-card-text>
        </v-card>
      </v-col>
      <v-col>
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'tournament-join',
            })
          "
        >
          <v-card-text class="text-center"
            ><h2>Join Tournament</h2></v-card-text
          >
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
