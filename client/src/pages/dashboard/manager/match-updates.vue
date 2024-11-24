<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import NoItems from "@/components/NoItems.vue";
import MatchCard from "@/components/MatchCard.vue";

definePage({
  name: "match-updates",
  meta: {
    requiresAuth: true,
    title: "Match Updates",
    layout: "default",
  },
});

const router = useRouter();
const store = useStore();

const matches = computed(() => store.state.team.matches);
const tab = ref("future");

const fetchData = () => {
  return store.dispatch("team/setMatches");
};
onMounted(async () => {
  fetchData();
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          :back-route="{ name: 'dashboard' }"
          justify="space-between"
          sub-title="Tournament"
          title="Matches"
        />
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col :cols="12" md="6">
        <v-tabs v-model="tab" bg-color="primary">
          <v-tab value="future">Upcoming</v-tab>
          <v-tab value="past">Past</v-tab>
        </v-tabs>

        <v-tabs-window v-model="tab">
          <v-tabs-window-item value="future">
            <template v-if="matches.futureMatches?.length > 0">
              <match-card
                v-for="(match, index) in matches.futureMatches"
                :match="match"
                :showDate="true"
                :showField="true"
                :showTime="true"
                :showTournament="true"
                container-class="ma-4 max-600"
              ></match-card>
            </template>
            <no-items v-else></no-items>
          </v-tabs-window-item>

          <v-tabs-window-item value="past">
            <template v-if="matches.pastMatches?.length > 0">
              <match-card
                v-for="(match, index) in matches.pastMatches"
                :match="match"
                :showDate="true"
                :showField="true"
                :showTime="true"
                :showTournament="true"
                container-class="ma-4 max-600"
              ></match-card>
            </template>
            <no-items v-else></no-items>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-col>
    </v-row>
  </v-container>
</template>

<style>
.max-600 {
  max-width: 400px;
}
</style>
