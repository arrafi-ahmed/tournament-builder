<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import TournamentBaseFormat from "@/components/TournamentBaseFormat.vue";
import { useDisplay } from "vuetify";
import {
  calcMatchType,
  formatDate,
  getDateOnly,
  getRoundTitle,
  getTeamLogoUrl,
  getTimeOnly,
} from "@/others/util";
import * as tournamentStanding from "@/store/modules/tournament-standing";
import RemoveEntity from "@/components/RemoveEntity.vue";
import NoItems from "@/components/NoItems.vue";
import MatchCard from "@/components/MatchCard.vue";

const route = useRoute();
const router = useRouter();
const store = useStore();
const { xs, width, name } = useDisplay();

const tournament = computed(() => store.state.tournament.tournament);
const standing = computed(() => store.state.tournamentStanding.standing);
const schedule = computed(() => store.state.tournamentStanding.schedule);
const participants = computed(() => store.state.tournament.participants);

const parentTab = ref(null);
const tab = ref(null);

const fetchData = async () => {
  return Promise.all([
    store.dispatch("tournament/setTournamentWEmailOptionalById", {
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("tournamentStanding/setTournamentStanding", {
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("tournament/setParticipants", {
      tournamentId: route.params.tournamentId,
    }),
  ]);
};
onMounted(async () => {
  await fetchData();
  document.title = tournament.value.name;
});
</script>

<template>
  <v-container class="public">
    <v-row>
      <v-col>
        <page-title
          :sub-title="`${formatDate(tournament.startDate)} - ${formatDate(tournament.endDate)}`"
          justify="space-between"
          :show-back="false"
          :title="tournament.name"
        >
<!--          <v-row align="center">-->
<!--            <v-menu>-->
<!--              <template v-slot:activator="{ props }">-->
<!--                <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text">-->
<!--                </v-btn>-->
<!--              </template>-->
<!--              <v-list density="compact">-->
<!--                <v-list-item-->
<!--                  :to="{-->
<!--                    name: 'tournament-invite',-->
<!--                    params: { tournamentId: tournament.id },-->
<!--                  }"-->
<!--                  density="compact"-->
<!--                  prepend-icon="mdi-plus"-->
<!--                  title="Invite Team"-->
<!--                ></v-list-item>-->
<!--              </v-list>-->
<!--            </v-menu>-->
<!--          </v-row>-->
        </page-title>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-tabs v-model="parentTab" bg-color="primary">
          <v-tab value="participants">Participants</v-tab>
          <v-tab value="schedule">Schedule</v-tab>
          <v-tab value="standing">Standing</v-tab>
        </v-tabs>

        <v-tabs-window v-model="parentTab">
          <v-tabs-window-item value="participants">
            <v-list
              v-if="participants.length > 0"
              density="compact"
              elevation="1"
              lines="two"
              rounded
            >
              <template v-for="(item, index) in participants">
                <v-list-item
                  v-if="item"
                  :key="index"
                  :title="item?.name"
                  link
                  @click="
                    router.push({
                      name: 'team-squad',
                      params: {
                        teamId: item.id,
                      },
                    })
                  "
                >
                  <template v-slot:prepend>
                    <v-avatar
                      :image="getTeamLogoUrl(item.logo)"
                      :size="50"
                      rounded="sm"
                    ></v-avatar>
                  </template>

                  <template v-slot:subtitle>
                    <div class="text-truncate">
                      {{ item?.description }}
                    </div>
                  </template>
                </v-list-item>
                <v-divider v-if="index !== participants.length - 1"></v-divider>
              </template>
            </v-list>
            <no-items v-else :cols="12"></no-items>
          </v-tabs-window-item>

          <v-tabs-window-item value="schedule">
            <v-row v-for="matchDay in schedule" class="mt-4 mb-1">
              <v-col>
                <div class="text-body-1">
                  {{ formatDate(matchDay.matchDate) }}
                </div>
                <v-divider></v-divider>

                <v-row class="ma-1">
                  <v-col v-for="match in matchDay.matches" cols="12" sm="6" md="4">
                    <match-card :match="match"></match-card>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <v-tabs-window-item value="standing">
            <v-row justify="center">
              <v-col>
                <v-tabs
                  v-model="tab"
                  v-if="standing.length"
                  bg-color="transparent"
                  color="secondary"
                  density="compact"
                >
                  <template v-for="(phase, phaseIndex) in standing">
                    <v-tab :value="phase.phaseId">{{ phase.phaseName }}</v-tab>
                  </template>
                </v-tabs>

                <v-tabs-window v-model="tab">
                  <template v-for="(phase, phaseIndex) in standing">
                    <v-tabs-window-item :value="phase.phaseId" class="ma-1">
                      <template
                        v-for="(phaseItem, phaseItemIndex) in phase.items"
                      >
                        <div v-if="phaseItem.type === 'group'">
                          <v-card :title="phaseItem.name" class="my-5">
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
                          <v-card :title="phaseItem.name" class="my-5">
                            <v-card-text>
                              <v-row class="scrollable-container">
                                <v-col
                                  :cols="phaseItem.rounds.length * 3"
                                  class="max-content"
                                >
                                  <v-row>
                                    <template
                                      v-for="(
                                        round, roundIndex
                                      ) in phaseItem.rounds"
                                    >
                                      <v-col
                                        :cols="12 / phaseItem.rounds.length"
                                      >
                                        <div
                                          class="text-body-1 font-weight-medium"
                                        >
                                          {{ getRoundTitle(round.roundType) }}
                                        </div>

                                        <template
                                          v-for="(
                                            match, matchIndex
                                          ) in round.matches"
                                        >
                                          <match-card
                                            :match="match"
                                            :show-time="false"
                                            :show-field="false"
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
                        </div>

                        <v-row v-else-if="phaseItem.type === 'single_match'">
                          <v-col cols="3">
                            <match-card
                              :match="phaseItem"
                              :showTime="false"
                              :showField="false"
                              :show-lg-title="true"
                            ></match-card>
                          </v-col>
                        </v-row>
                      </template>
                    </v-tabs-window-item>
                  </template>
                </v-tabs-window>
              </v-col>
            </v-row>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-col>
    </v-row>
  </v-container>
</template>

<style>
.public .v-col {
  max-width: 100% !important;
}

</style>
