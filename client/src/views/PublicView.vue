<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import TournamentBaseFormat from "@/components/TournamentBaseFormat.vue";
import { useDisplay } from "vuetify";
import {
  calcMatchType,
  getDateOnly,
  getRoundTitle,
  getTeamLogoUrl,
  getTimeOnly,
} from "@/others/util";
import * as tournamentStanding from "@/store/modules/tournament-standing";
import RemoveEntity from "@/components/RemoveEntity.vue";
import NoItems from "@/components/NoItems.vue";

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
  console.log(3, tournament.value);
  document.title = tournament.value.name;
});
</script>

<template>
  <v-container class="format">
    <v-row>
      <v-col>
        <page-title
          :sub-title="`${getDateOnly(tournament.startDate)} | ${getDateOnly(tournament.endDate)}`"
          justify="space-between"
          show-back
          :title="tournament.name"
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
                    name: 'tournament-invite',
                    params: { tournamentId: tournament.id },
                  }"
                  density="compact"
                  prepend-icon="mdi-plus"
                  title="Invite Team"
                ></v-list-item>
              </v-list>
            </v-menu>
          </v-row>
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
            <v-row v-for="matchDay in schedule" class="mt-4">
              <v-col>
                <h4>{{ getDateOnly(matchDay.matchDate) }}</h4>
                <v-divider></v-divider>

                <v-row v-for="match in matchDay.matches" class="mt-1" justify="center">
                  <v-col cols="12" md="6">
                    <v-card variant="outlined" max-width="600">
                      <v-card-title>
                        <span>
                          <v-chip color="primary" variant="flat" label
                            >{{ getTimeOnly(match.startTime) }}
                          </v-chip>
                        </span>
                        <span class="ml-3">
                          {{ match.name }}
                        </span>
                      </v-card-title>
                      <v-card-subtitle>
                        {{ match.fieldName }}
                      </v-card-subtitle>
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
                  bg-color="secondary"
                  density="compact"
                >
                  <template v-for="(phase, phaseIndex) in standing">
                    <v-tab :value="phase.phaseId">{{ phase.phaseName }}</v-tab>
                  </template>
                </v-tabs>

                <v-tabs-window v-model="tab">
                  <template v-for="(phase, phaseIndex) in standing">
                    <v-tabs-window-item :value="phase.phaseId">
                      <template
                        v-for="(phaseItem, phaseItemIndex) in phase.items"
                      >
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

                                <template
                                  v-for="(match, matchIndex) in round.matches"
                                >
                                  <v-card
                                    :title="match.name"
                                    :subtitle="match.fieldName"
                                    class="my-5"
                                    variant="outlined"
                                  >
                                    <v-card-text>
                                      <v-row>
                                        <v-col>
                                          {{
                                            match.homeTeamName ||
                                            match.homeTeamId
                                          }}
                                          <v-chip
                                            :color="
                                              match.winnerId ===
                                              match.homeTeamId
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
                                          {{
                                            match.awayTeamName ||
                                            match.awayTeamId
                                          }}
                                          <v-chip
                                            :color="
                                              match.winnerId ===
                                              match.awayTeamId
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
                                  {{
                                    phaseItem.homeTeamName ||
                                    phaseItem.homeTeamId
                                  }}
                                  <v-chip
                                    :color="
                                      phaseItem.winnerId ===
                                      phaseItem.homeTeamId
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
                                  {{
                                    phaseItem.awayTeamName ||
                                    phaseItem.awayTeamId
                                  }}
                                  <v-chip
                                    :color="
                                      phaseItem.winnerId ===
                                      phaseItem.awayTeamId
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
          </v-tabs-window-item>
        </v-tabs-window>
      </v-col>
    </v-row>
  </v-container>
</template>

<style></style>
