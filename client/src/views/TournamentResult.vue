<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import RemoveEntity from "@/components/RemoveEntity.vue";
import NoItems from "@/components/NoItems.vue";
import { calcMatchType, getTeamLogoUrl, getTimeOnly } from "@/others/util";

const router = useRouter();
const route = useRoute();
const store = useStore();

const results = computed(() => store.state.tournamentResult.results);
const matchDays = computed(() =>
  results.value.map(({ id, matchDate }) => ({ id, matchDate })),
);
const tournament = computed(() => store.state.tournament.tournament);
const participants = computed(() => store.state.tournament.participants);

const selectedMatchDate = ref(null);

const matchesForSelectedDate = computed(() => {
  if (!selectedMatchDate.value) return [];

  const foundMatchDay = store.state.tournamentResult.results.find(
    (matchDay) => matchDay.id === selectedMatchDate.value.id,
  );
  return foundMatchDay?.matches ?? [];
});
const selectWinnerOptions = ref([
  { teamId: null, teamName: null },
  { teamId: null, teamName: null },
]);
const selectedWinner = ref(selectWinnerOptions.value[0]);
const showSelectWinner = ref(false);
const currSelectedMatchIndex = ref(0);

const saveResult = ({ matchIndex }) => {
  const targetMatch = matchesForSelectedDate.value[matchIndex];
  // console.log(1, matchesForSelectedDate.value[matchIndex]);
  if (targetMatch.homeTeamScore > targetMatch.awayTeamScore) {
    targetMatch.winnerId = targetMatch.homeTeamId;
  } else if (targetMatch.homeTeamScore < targetMatch.awayTeamScore) {
    targetMatch.winnerId = targetMatch.awayTeamId;
  } else {
    //if scores equal
    targetMatch.winnerId = selectedWinner.value.teamId;
  }
  const matchResult = {
    matchId: targetMatch.id,
    homeTeamScore: targetMatch.homeTeamScore,
    awayTeamScore: targetMatch.awayTeamScore,
    winnerId: targetMatch.winnerId,
  };
  let refData = {
    updatedMatchHomeTeamId: targetMatch.homeTeamId,
    updatedMatchAwayTeamId: targetMatch.awayTeamId,
  };
  store.dispatch("tournamentResult/saveMatchResultByMatchId", {
    matchResult,
    refData,
    selectedMatchDate: selectedMatchDate.value,
    selectedMatchIndex: matchIndex,
  });
};
const clearResult = ({ matchIndex }) => {
  const targetMatch = matchesForSelectedDate.value[matchIndex];
  store.dispatch("tournamentResult/clearResult", {
    resultId: targetMatch.resultId,
    selectedMatchDate: selectedMatchDate.value,
  });
};

const checkMatchScore = ({ match, matchIndex }) => {
  const copiedHomeTeamScore = isNaN(Number(match.homeTeamScore))
    ? null
    : Number(match.homeTeamScore);
  const copiedAwayTeamScore = isNaN(Number(match.awayTeamScore))
    ? null
    : Number(match.awayTeamScore);

  if (
    !match.homeTeamScore ||
    !match.awayTeamScore ||
    copiedHomeTeamScore !== copiedAwayTeamScore
  )
    return (showSelectWinner.value = false);

  selectWinnerOptions.value[0] = {
    teamId: match.homeTeamId,
    teamName: match.homeTeamName,
  };
  selectWinnerOptions.value[1] = {
    teamId: match.awayTeamId,
    teamName: match.awayTeamName,
  };

  currSelectedMatchIndex.value = matchIndex;
  showSelectWinner.value = true;
  selectedWinner.value = selectWinnerOptions.value.find(
    (item) => item.teamId === match.winnerId,
  );
};

const fetchData = () => {
  return Promise.all([
    store.dispatch("tournamentResult/setResults", {
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("tournament/setTournamentWEmailOptionalById", {
      tournamentId: route.params.tournamentId,
    }),
  ]);
};

onMounted(async () => {
  await fetchData();
  selectedMatchDate.value = matchDays.value[0];
});
</script>

<template>
  <v-container>
    <!--    {{ results }}-->
    <v-row>
      <v-col>
        <page-title
          :sub-title="tournament.name"
          justify="space-between"
          show-back
          title="Result"
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
      <v-col cols="auto">
        <v-select
          v-model="selectedMatchDate"
          :items="matchDays"
          color="primary"
          density="compact"
          hide-details="auto"
          item-title="matchDate"
          item-value="id"
          label="Match Dates"
          prepend-inner-icon="mdi-calendar"
          return-object
          rounded-sm
          variant="solo-filled"
          width="200"
        ></v-select>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col col="12" md="10" lg="7">
        <v-list
          v-if="matchesForSelectedDate.length > 0"
          density="compact"
          elevation="1"
          lines="two"
          rounded
        >
          <template v-for="(item, index) in matchesForSelectedDate">
            <v-list-item
              v-if="item"
              :key="index"
              :disabled="!item.homeTeamId || !item.awayTeamId"
            >
              <v-list-item-title
                class="d-flex align-center justify-space-between"
              >
                <span>
                  <v-chip color="primary" variant="flat" label size="large"
                    >{{ getTimeOnly(item.startTime) }}
                  </v-chip>
                  <span class="ml-3">{{ item?.name }}</span>
                  <v-chip
                    class="ml-3"
                    :color="calcMatchType(item.type).color"
                    density="comfortable"
                    >{{ calcMatchType(item.type).title }}
                  </v-chip>
                </span>
                <span>
                  <v-btn
                    icon="mdi-close"
                    color="error"
                    density="comfortable"
                    variant="outlined"
                    class="ml-1"
                    @click="clearResult({ matchIndex: index })"
                  ></v-btn>
                  <v-btn
                    icon="mdi-check"
                    color="success"
                    density="comfortable"
                    variant="outlined"
                    class="ml-2"
                    @click="saveResult({ matchIndex: index })"
                  ></v-btn>
                </span>
              </v-list-item-title>

              <v-list-item-subtitle class="mt-2 ml-1">
                {{ item.fieldName }}
              </v-list-item-subtitle>

              <v-row
                class="mt-2"
                v-if="showSelectWinner && currSelectedMatchIndex === index"
              >
                <v-col cols="auto">
                  <v-select
                    v-model="selectedWinner"
                    :items="selectWinnerOptions"
                    color="primary"
                    density="compact"
                    hide-details="auto"
                    item-title="teamName"
                    item-value="teamId"
                    label="Select Winner"
                    prepend-inner-icon="mdi-calendar"
                    return-object
                    rounded-sm
                    variant="solo-filled"
                    width="200"
                  ></v-select>
                </v-col>
              </v-row>

              <v-row class="mt-2">
                <pre>
                  {{item}}
                </pre>
                <v-col>
                  <div class="d-flex align-center">
                    <!--                    TODO:fix name-->
                    <h3>
                      {{ item.homeTeamName || `Team ${item.homeTeamId}` }}
                    </h3>
                    <v-chip
                      v-if="
                        item.winnerId !== null &&
                        item.winnerId === item.homeTeamId
                      "
                      color="green-darken-1"
                      variant="flat"
                      density="compact"
                      class="ml-1"
                      >Winner
                    </v-chip>
                  </div>
                  <v-text-field
                    v-model="item.homeTeamScore"
                    :disabled="!item.homeTeamId"
                    color="primary"
                    variant="underlined"
                    hide-details="auto"
                    label="Score"
                    type="number"
                    :max-width="60"
                    @change="
                      checkMatchScore({
                        match: item,
                        matchIndex: index,
                      })
                    "
                  ></v-text-field>
                </v-col>
                <v-col cols="auto">
                  <v-chip color="error">V</v-chip>
                </v-col>
                <v-col>
                  <div class="d-flex align-center">
                    <h3>
                      {{ item.awayTeamName || `Team ${item.awayTeamId}` }}
                    </h3>
                    <v-chip
                      v-if="
                        item.winnerId !== null &&
                        item.winnerId === item.awayTeamId
                      "
                      color="green-darken-1"
                      variant="flat"
                      density="compact"
                      class="ml-1"
                      >Winner
                    </v-chip>
                  </div>
                  <v-text-field
                    v-model="item.awayTeamScore"
                    :disabled="!item.awayTeamId"
                    color="primary"
                    variant="underlined"
                    hide-details="auto"
                    label="Score"
                    type="number"
                    :max-width="60"
                    @change="
                      checkMatchScore({
                        match: item,
                        matchIndex: index,
                      })
                    "
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-list-item>
            <v-divider
              v-if="index !== matchesForSelectedDate.length - 1"
              class="my-2"
              thickness="2"
            ></v-divider>
          </template>
        </v-list>
        <no-items v-else :cols="12"></no-items>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
