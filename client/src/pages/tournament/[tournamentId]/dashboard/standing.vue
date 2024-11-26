<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import { useDisplay } from "vuetify";
import {
  addSwipeBlocking,
  getRoundTitle,
  removeSwipeBlocking,
} from "@/others/util";
import MatchCard from "@/components/MatchCard.vue";
import NoItems from "@/components/NoItems.vue";

definePage({
  name: "tournament-standing",
  meta: {
    requiresAuth: true,
    title: "Standing",
    layout: "tournament-dashboard",
  },
});

const route = useRoute();
const store = useStore();
const { xs, width, name } = useDisplay();

const tournament = computed(() => store.state.tournament.tournament);
const standing = computed(() => store.state.tournamentStanding.standing);
const schedule = computed(() => store.state.tournamentStanding.schedule);

const tab = ref(null);

const fetchData = async () => {
  return Promise.all([
    store.dispatch("tournament/setTournamentWEmailOptionalById", {
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("tournamentStanding/setTournamentStanding", {
      tournamentId: route.params.tournamentId,
    }),
  ]);
};
const formattedName = computed(() =>
  tournament.value.name.toLowerCase().replaceAll(" ", "-"),
);
onMounted(async () => {
  fetchData();
  addSwipeBlocking();
});
onUnmounted(() => {
  removeSwipeBlocking();
});
</script>

<template>
  <v-container class="standing">
    <v-row>
      <v-col>
        <page-title
          :back-route="{ name: 'tournament-list' }"
          :sub-title="tournament.name"
          justify="space-between"
          title="Standings"
        >
          <v-row align="center">
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text">
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item
                  :to="{
                    name: 'public-view',
                    params: { tournamentSlug: tournament.slug },
                  }"
                  density="compact"
                  prepend-icon="mdi-eye"
                  title="Public View"
                ></v-list-item>
              </v-list>
            </v-menu>
          </v-row>
        </page-title>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col>
        <v-tabs
          v-if="standing.length"
          v-model="tab"
          bg-color="transparent"
          color="secondary"
          density="compact"
        >
          <template v-for="(phase, phaseIndex) in standing">
            <v-tab :value="phase.phaseId">{{ phase.phaseName }}</v-tab>
          </template>
        </v-tabs>

        <no-items v-else />

        <v-tabs-window v-model="tab" class="no-block-swipe">
          <template v-for="(phase, phaseIndex) in standing">
            <v-tabs-window-item :value="phase.phaseId" class="ma-1">
              <template v-for="(phaseItem, phaseItemIndex) in phase.items">
                <v-card
                  v-if="phaseItem.type === 'group'"
                  :title="phaseItem.name"
                  class="my-2"
                >
                  <v-card-text>
                    <v-table density="compact">
                      <thead>
                        <tr>
                          <th>Teams</th>
                          <th>PLD</th>
                          <th>W</th>
                          <th>D</th>
                          <th>L</th>
                          <th>PTS</th>
                          <th>GF</th>
                          <th>GA</th>
                          <th>GD</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(
                            teamStat, teamStatIndex
                          ) in phaseItem.teamStats"
                        >
                          <td>
                            {{ teamStat.teamName || teamStat.teamId }}
                          </td>
                          <td>{{ teamStat.played }}</td>
                          <td>{{ teamStat.won }}</td>
                          <td>{{ teamStat.draw }}</td>
                          <td>{{ teamStat.lost }}</td>
                          <td>{{ teamStat.points }}</td>
                          <td>{{ teamStat.goalsFor }}</td>
                          <td>{{ teamStat.goalsAway }}</td>
                          <td>{{ teamStat.goalDifference }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-card-text>
                </v-card>
                <v-card
                  v-else-if="phaseItem.type === 'bracket'"
                  :title="phaseItem.name"
                  class="my-2"
                >
                  <v-card-text>
                    <v-row class="scrollable-container">
                      <v-col
                        :cols="phaseItem.rounds.length * 3"
                        class="max-content"
                      >
                        <v-row>
                          <template
                            v-for="(round, roundIndex) in phaseItem.rounds"
                          >
                            <v-col :cols="12 / phaseItem.rounds.length">
                              <div class="text-body-1 font-weight-medium">
                                {{ getRoundTitle(round.roundType) }}
                              </div>

                              <template
                                v-for="(match, matchIndex) in round.matches"
                              >
                                <match-card
                                  :match="match"
                                  :show-field="false"
                                  :show-time="false"
                                  container-class="mt-4"
                                ></match-card>
                              </template>
                            </v-col>
                          </template>
                        </v-row>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>

                <v-row
                  v-else-if="phaseItem.type === 'single_match'"
                  class="my-2"
                >
                  <v-col cols="3">
                    <match-card
                      :match="phaseItem"
                      :show-lg-title="true"
                      :showField="false"
                      :showTime="false"
                    ></match-card>
                  </v-col>
                </v-row>
              </template>
            </v-tabs-window-item>
          </template>
        </v-tabs-window>
      </v-col>
    </v-row>
  </v-container>
</template>

<style>
.standing .v-col {
  max-width: 100% !important;
}
</style>
