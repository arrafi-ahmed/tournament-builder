<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import TournamentBaseFormat from "@/components/TournamentBaseFormat.vue";
import { useDisplay } from "vuetify";
import { calcMatchType, getRoundTitle } from "@/others/util";
import * as tournamentStanding from "@/store/modules/tournament-standing";

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
onMounted(async () => {
  fetchData();
});
</script>

<template>
  <v-container class="format">
    <v-row>
      <v-col>
        <page-title
          :sub-title="tournament.name"
          justify="space-between"
          show-back
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
                    params: { tournamentId: tournament.id },
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
        <v-tabs v-model="tab" v-if="standing.length" bg-color="primary">
          <template v-for="(phase, phaseIndex) in standing">
            <v-tab :value="phase.phaseId">{{ phase.phaseName }}</v-tab>
          </template>
        </v-tabs>

        <v-tabs-window v-model="tab">
          <template v-for="(phase, phaseIndex) in standing">
            <v-tabs-window-item :value="phase.phaseId">
              <template v-for="(phaseItem, phaseItemIndex) in phase.items">
                <div v-if="phaseItem.type === 'group'">
                  <v-card
                    :title="phaseItem.name"
                    class="my-5"
                    variant="outlined"
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
                </div>
                <div v-else-if="phaseItem.type === 'bracket'">
                  <v-card
                    :title="phaseItem.name"
                    class="my-5"
                    variant="outlined"
                  >
                    <v-card-text>
                      <template v-for="round in phaseItem.rounds">
                        <h4>{{ getRoundTitle(round.roundType) }}</h4>

                        <template v-for="(match, matchIndex) in round.matches">
                          <v-card
                            :title="match.name"
                            :subtitle="match.fieldName"
                            class="my-5"
                            variant="outlined"
                          >
                            <v-card-text>
                              <v-row>
                                <v-col>
                                  {{ match.homeTeamName || match.homeTeamId }}
                                  <v-chip
                                    :color="
                                      match.winnerId === match.homeTeamId
                                        ? 'success'
                                        : 'error'
                                    "
                                    class="ml-4"
                                    size="large"
                                    label
                                    rounded
                                    inline
                                    >{{ match.homeTeamScore }}
                                  </v-chip>
                                </v-col>
                                <v-col>
                                  {{ match.awayTeamName || match.awayTeamId }}
                                  <v-chip
                                    :color="
                                      match.winnerId === match.awayTeamId
                                        ? 'success'
                                        : 'error'
                                    "
                                    class="ml-4"
                                    size="large"
                                    label
                                    rounded
                                    inline
                                    >{{ match.awayTeamScore }}
                                  </v-chip>
                                </v-col>
                              </v-row>
                            </v-card-text>
                          </v-card>
                        </template>
                      </template>
                    </v-card-text>
                  </v-card>
                </div>

                <div v-else-if="phaseItem.type === 'single_match'">
                  <v-card
                    :title="phaseItem.name"
                    :subtitle="phaseItem.fieldName"
                    class="my-5"
                    variant="outlined"
                  >
                    <v-card-text>
                      <v-row>
                        <v-col>
                          {{ phaseItem.homeTeamName || phaseItem.homeTeamId }}
                          <v-chip
                            :color="
                              phaseItem.winnerId === phaseItem.homeTeamId
                                ? 'success'
                                : 'error'
                            "
                            class="ml-4"
                            size="large"
                            label
                            rounded
                            inline
                            >{{ phaseItem.homeTeamScore }}
                          </v-chip>
                        </v-col>
                        <v-col>
                          {{ phaseItem.awayTeamName || phaseItem.awayTeamId }}
                          <v-chip
                            :color="
                              phaseItem.winnerId === phaseItem.awayTeamId
                                ? 'success'
                                : 'error'
                            "
                            class="ml-4"
                            size="large"
                            label
                            rounded
                            inline
                            >{{ phaseItem.awayTeamScore }}
                          </v-chip>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </div>
              </template>
            </v-tabs-window-item>
          </template>
        </v-tabs-window>
      </v-col>
    </v-row>
  </v-container>
</template>

<style></style>
