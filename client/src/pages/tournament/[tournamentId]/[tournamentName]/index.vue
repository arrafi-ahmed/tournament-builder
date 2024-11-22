<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import { useDisplay } from "vuetify";
import {
  formatDate,
  getQueryParam,
  getRoundTitle,
  getTeamLogoUrl,
} from "@/others/util";
import NoItems from "@/components/NoItems.vue";
import MatchCard from "@/components/MatchCard.vue";

definePage({
  name: "public-view",
  meta: {
    layout: "headerless",
  },
});

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
  if (tournament.value?.name) {
    document.title = tournament.value?.name;
  }
  // const currentUrl = window.location.href;
  // const newUrl = `${currentUrl}/${tournament.value.name.toLowerCase().replaceAll(" ", "-")}`;
  // window.history.replaceState(null, "", newUrl);

  const referred = getQueryParam("ref");
  const validTabs = ["schedule", "standing", "participants", "rules"];

  if (validTabs.includes(referred)) {
    parentTab.value = referred;
  }
});
</script>

<template>
  <v-container class="public">
    <template v-if="tournament">
      <v-row>
        <v-col>
          <page-title
            :show-back="false"
            :sub-title="`${formatDate(tournament?.startDate) || 'TBA'} - ${
              formatDate(tournament?.endDate) || 'TBA'
            }`"
            :title="tournament?.name"
            justify="space-between"
          >
          </page-title>
        </v-col>
      </v-row>

      <v-row>
        <v-col>
          <v-tabs v-model="parentTab" bg-color="primary">
            <v-tab value="participants">Participants</v-tab>
            <v-tab value="schedule">Schedule</v-tab>
            <v-tab value="standing">Standing</v-tab>
            <v-tab value="rules">Rules</v-tab>
          </v-tabs>

          <v-tabs-window v-model="parentTab">
            <v-tabs-window-item value="participants">
              <v-list
                v-if="participants.length > 0"
                class="my-2"
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
                          teamId: item.teamId,
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
                  <v-divider
                    v-if="index !== participants.length - 1"
                  ></v-divider>
                </template>
              </v-list>
              <no-items v-else :cols="12"></no-items>
            </v-tabs-window-item>

            <v-tabs-window-item value="schedule">
              <v-row v-if="schedule.length > 0" class="my-2">
                <template v-for="matchDay in schedule">
                  <v-col>
                    <div class="text-body-1">
                      {{ formatDate(matchDay.matchDate) }}
                    </div>
                    <v-divider></v-divider>

                    <v-row class="ma-1">
                      <v-col
                        v-for="match in matchDay.matches"
                        cols="12"
                        md="4"
                        sm="6"
                      >
                        <match-card :match="match"></match-card>
                      </v-col>
                    </v-row>
                  </v-col>
                </template>
              </v-row>
              <no-items v-else :cols="12"></no-items>
            </v-tabs-window-item>

            <v-tabs-window-item value="standing">
              <v-row v-if="standing.length" justify="center">
                <v-col>
                  <v-tabs
                    v-if="standing.length"
                    v-model="tab"
                    bg-color="transparent"
                    color="secondary"
                    density="compact"
                  >
                    <template v-for="(phase, phaseIndex) in standing">
                      <v-tab :value="phase.phaseId"
                        >{{ phase.phaseName }}
                      </v-tab>
                    </template>
                  </v-tabs>

                  <v-tabs-window v-model="tab">
                    <template v-for="(phase, phaseIndex) in standing">
                      <v-tabs-window-item :value="phase.phaseId" class="ma-1">
                        <template
                          v-for="(phaseItem, phaseItemIndex) in phase.items"
                        >
                          <v-card
                            v-if="phaseItem.type === 'group'"
                            :title="phaseItem.name"
                            class="my-4"
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
              <no-items v-else :cols="12"></no-items>
            </v-tabs-window-item>

            <v-tabs-window-item value="rules">
              <v-row>
                <v-col class="my-2 mx-1 text-pre-wrap">
                  <p>
                    {{ tournament.rules || "No rules set yet." }}
                  </p>
                </v-col>
              </v-row>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-col>
      </v-row>
    </template>
    <no-items v-else />
  </v-container>
</template>

<style>
.public .v-col {
  max-width: 100% !important;
}
</style>
