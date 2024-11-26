<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import NoItems from "@/components/NoItems.vue";
import { calcMatchType, getTeamName, getTimeOnly } from "@/others/util";

definePage({
  name: "tournament-result",
  meta: {
    requiresAuth: true,
    title: "Result",
    layout: "tournament-dashboard",
  },
});

const router = useRouter();
const route = useRoute();
const store = useStore();

const results = computed(() => store.state.tournamentResult.results);
const matchDays = computed(() => store.state.tournamentResult.results);
const titles = computed(() => store.state.tournamentResult.titles);

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
  if (targetMatch.homeTeamScore > targetMatch.awayTeamScore) {
    targetMatch.winnerId = targetMatch.homeTeamId;
  } else if (targetMatch.homeTeamScore < targetMatch.awayTeamScore) {
    targetMatch.winnerId = targetMatch.awayTeamId;
  } else {
    //if scores equal
    targetMatch.winnerId = selectedWinner.value.teamId;
  }
  const matchResult = {
    id: targetMatch.resultId,
    matchId: targetMatch.id,
    homeTeamScore: targetMatch.homeTeamScore,
    awayTeamScore: targetMatch.awayTeamScore,
    winnerId: targetMatch.winnerId,
  };
  let actionName =
    targetMatch.type === "group"
      ? "saveGroupMatchResult"
      : "saveSingleMatchResult";

  store.dispatch(`tournamentResult/${actionName}`, {
    matchResult,
    groupId: targetMatch.groupId,
    selectedMatchDate: selectedMatchDate.value,
    selectedMatchIndex: matchIndex,
    updatedMatchHomeTeamId: targetMatch.homeTeamId,
    updatedMatchAwayTeamId: targetMatch.awayTeamId,
  });
};
const clearResult = ({ matchIndex }) => {
  const targetMatch = matchesForSelectedDate.value[matchIndex];
  const payload = {
    resultId: targetMatch.resultId,
    selectedMatchDate: selectedMatchDate.value,
    match: {
      id: targetMatch.id,
      home: { teamId: targetMatch.homeTeamId },
      away: { teamId: targetMatch.awayTeamId },
    },
    groupTeamReference: targetMatch.groupTeamReference,
  };
  //if match->type = 'group', update tournament_group->ranking_published
  if (targetMatch.type === "group") {
    payload.match.type = targetMatch.type;
    payload.match.groupId = targetMatch.groupId;
    payload.match.rankingPublished = targetMatch.rankingPublished;
  }
  store.dispatch("tournamentResult/clearResult", payload);
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
          :back-route="{ name: 'tournament-list' }"
          :sub-title="tournament.name"
          justify="space-between"
          title="Result"
        >
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
      <v-col :cols="12" lg="7" md="10">
        <v-list
          v-if="matchesForSelectedDate.length > 0"
          density="compact"
          elevation="1"
          lines="two"
          rounded
        >
          <template v-for="(item, index) in matchesForSelectedDate">
            <v-list-item v-if="item" :key="index">
              <v-list-item-title>
                <div class="d-flex align-center justify-space-between">
                  <span>
                    <v-chip color="primary" label size="large" variant="flat"
                      >{{ getTimeOnly(item.startTime) }}
                    </v-chip>
                    <v-chip
                      :color="calcMatchType(item.type).color"
                      class="ml-3"
                      density="comfortable"
                      >{{ calcMatchType(item.type).title }}
                    </v-chip>
                  </span>
                  <span>
                    <v-btn
                      class="ml-1"
                      color="error"
                      density="comfortable"
                      icon="mdi-close"
                      variant="outlined"
                      @click="clearResult({ matchIndex: index })"
                    ></v-btn>
                    <v-btn
                      :disabled="!item.homeTeamId || !item.awayTeamId"
                      class="ml-2"
                      color="success"
                      density="comfortable"
                      icon="mdi-check"
                      variant="outlined"
                      @click="saveResult({ matchIndex: index })"
                    ></v-btn>
                  </span>
                </div>
                <div class="d-flex align-center mt-2">
                  {{ item?.name }}
                </div>
              </v-list-item-title>

              <v-list-item-subtitle class="mt-1 ml-1">
                {{ item.fieldName }}
              </v-list-item-subtitle>

              <v-row align="center" class="my-1" no-gutters>
                <v-col>
                  <span class="font-weight-medium me-2">
                    {{ item.homeTeamName || getTeamName(item, "home", titles) }}
                  </span>
                  <v-chip
                    v-if="
                      item.winnerId !== null &&
                      item.winnerId === item.homeTeamId
                    "
                    color="green-darken-1"
                    density="comfortable"
                    label
                    size="small"
                    variant="flat"
                    >Winner
                  </v-chip>
                </v-col>
                <v-col>
                  <v-number-input
                    v-model="item.homeTeamScore"
                    :disabled="!item.homeTeamId"
                    :max-width="150"
                    :min="0"
                    density="comfortable"
                    hide-details="auto"
                    label="Score"
                    @update:modelValue="
                      checkMatchScore({
                        match: item,
                        matchIndex: index,
                      })
                    "
                  ></v-number-input>
                </v-col>
              </v-row>

              <v-chip color="error" size="large">V</v-chip>

              <v-row align="center" class="my-1" no-gutters>
                <v-col>
                  <span class="font-weight-medium me-2">
                    {{ item.awayTeamName || getTeamName(item, "away", titles) }}
                  </span>
                  <v-chip
                    v-if="
                      item.winnerId !== null &&
                      item.winnerId === item.awayTeamId
                    "
                    color="green-darken-1"
                    density="comfortable"
                    label
                    size="small"
                    variant="flat"
                    >Winner
                  </v-chip>
                </v-col>
                <v-col>
                  <v-number-input
                    v-model="item.awayTeamScore"
                    :disabled="!item.awayTeamId"
                    :max-width="150"
                    :min="0"
                    density="comfortable"
                    hide-details="auto"
                    label="Score"
                    @update:modelValue="
                      checkMatchScore({
                        match: item,
                        matchIndex: index,
                      })
                    "
                  ></v-number-input>
                </v-col>
              </v-row>

              <v-row
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
