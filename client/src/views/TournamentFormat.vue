<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import TournamentBaseFormat from "@/components/TournamentBaseFormat.vue";
import { useDisplay } from "vuetify";

const router = useRouter();
const route = useRoute();
const store = useStore();
const { xs } = useDisplay();

const tournament = computed(() => store.state.tournament.tournament);
const tournamentFormatStructure = computed(
  () => tournament.value.formatShortcode
);
// const tournamentFormat = computed(() => {
//   if (tournamentFormatStructure.value?.length > 0) {
//     return tournamentFormatStructure.value.map((phaseStructure, index) => {
//       const savedPhase = tournamentFormatSaved.value[index];
//       return savedPhase ? savedPhase : phaseStructure;
//     });
//   } else {
//     return tournamentFormatStructure;
//   }
// });
const tournamentFormat = computed(
  () => store.state.tournamentFormat.tournamentFormat
);
const singleColWidth = ref(3);

const calcPhaseColWrapper = computed(() => {
  if (tournamentFormat.value?.length > 0) {
    return tournamentFormat.value.map((phase) => {
      const maxRoundLength = phase.items
        .filter((item) => item.type === "bracket")
        .reduce((max, item) => Math.max(max, item.rounds.length), 0);
      return maxRoundLength
        ? maxRoundLength * singleColWidth.value
        : singleColWidth.value;
    });
  } else return 0;
});

// in case bracket with more round, calc each phase item width
const calcPhaseCol = (index) => {
  return 12 / (calcPhaseColWrapper.value[index] / singleColWidth.value);
};

const getRoundTitle = (roundType) =>
  roundType == 0
    ? "Final"
    : roundType == 1
    ? "Semi-finals"
    : roundType == 2
    ? "Quarter-finals"
    : roundType == 3
    ? "Round of 32"
    : roundType == 4
    ? "Round of 64"
    : null;

const participants = computed(() => store.state.tournament.participants);
const groups = reactive({});
const teams = reactive({});
const matches = reactive({});

const groupTeamTitles = reactive({});
const matchTeamTitles = reactive({});
const groupMemberCount = computed(
  () => tournamentFormatStructure.value?.[0]?.[0]?.payload?.groupMemberCount
);

const teamOptions = reactive({});
const visibleTeamOptions = ref([]);
const selectedTeamOptions = reactive({});

const updateSelectedTeamOption = ({ newSelection, prevKey }) => {
  if (newSelection.id == prevKey) return;
  console.log(60, prevKey);
  console.log(61, selectedTeamOptions[prevKey]);
  console.log(62, newSelection);
  // console.log(62, selectedTeamOptions);
  // console.log(63, teamOptions);
  // if empty slot selected, make prev teamOptions[id].used = false; else true
  const targetSelectedOptionKey = selectedTeamOptions[prevKey].id;
  const targetTeamOption = teamOptions[targetSelectedOptionKey];
  if (newSelection.id === "empty") {
    teamOptions[targetSelectedOptionKey].used = false;
  } else if (teamOptions[targetSelectedOptionKey].id === "empty") {
    teamOptions[newSelection.id].used = true;
  } else {
    // make old selection used = false, new selection used = true
    teamOptions[targetSelectedOptionKey].used = false;
    teamOptions[newSelection.id].used = true;
  }
  // teamOptions[targetSelectedOptionKey].used = newSelection.id !== "empty";

  //update model value
  selectedTeamOptions[prevKey] = newSelection;
};

const updateTeamOptionsMenu = ({ id, isMenuOpen }) => {
  if (isMenuOpen) {
    const foundOption = teamOptions[id];
    visibleTeamOptions.value = Object.values(teamOptions)
      .filter((item) => {
        return item.phase < foundOption?.phase;
      })
      .filter((item) => !item.used);
  }
};
const populateTeamOptionsWParticipants = () => {
  teamOptions["empty"] = {
    name: `Empty Slot`,
    used: false,
    phase: 0,
    id: "empty",
  };

  participants.value.forEach((team, teamIndex) => {
    // for team type only input valid team with id
    if (team.id) {
      const id = `t-${team.id}`;
      teamOptions[id] = {
        name: team.name,
        used: false,
        phase: 0, // all teams phase is 0 as visible in phase 1 dropdown options
        id,
        itemId: null, //team.teamId
        // position,
        type: "team",
      };
    }
  });
};
const populateTeamOptions = (phaseItem, phaseId) => {
  if (phaseItem.type == "group") {
    // for group, populate groupMemberCount times
    for (let position = 1; position <= groupMemberCount.value; position++) {
      const id = `g-${phaseItem.id}-${position}`;
      teamOptions[id] = {
        name: `${phaseItem.name}, Ranking ${position}`,
        used: false,
        phase: phaseId,
        id,
        itemId: phaseItem.id, //group.id
        position,
        type: "group",
      };
    }
    phaseItem.teams.forEach((team, teamIndex) => {
      populateGroupSelectedOption(team, phaseItem.id, teamIndex + 1); // pos starts from 1
    });
  } else if (phaseItem.type == "single_match") {
    //for match, populate twice
    [1, 2].forEach((position) => {
      const textPrepend = position === 1 ? "Winner" : "Loser";
      const id = `m-${phaseItem.id}-${position}`;
      teamOptions[id] = {
        name: `${textPrepend}, ${phaseItem.name}`,
        used: false,
        phase: phaseId,
        id,
        itemId: phaseItem.id,
        position,
        type: "match",
      };
    });
    populateMatchSelectedOption(phaseItem);
  }
};
// todo: change func name, probably separate types
const populateGroupSelectedOption = (obj, keyId, keyPosition) => {
  const team = obj;
  const { id, futureTeamReference: reference } = team;
  if (team.teamId && teamOptions[`t-${team.teamId}`]) {
    selectedTeamOptions[`g-${keyId}-${keyPosition}`] =
      teamOptions[`t-${team.teamId}`];
    teamOptions[`t-${team.teamId}`].used = true;
    return;
  }

  if (!reference || !reference.id)
    return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] =
      teamOptions["empty"]);

  const { type, id: refId, position } = reference;
  const rankingPublished = false; // Replace with actual logic

  if (type === "group") {
    const foundGroup = groups[refId];
    const foundTeam = foundGroup?.teams.find((t) => t.teamRanking === position);

    if (rankingPublished) {
      selectedTeamOptions[`g-${keyId}-${keyPosition}`] =
        teamOptions[`t-${foundTeam.teamId}`];
      teamOptions[`g-${keyId}-${keyPosition}`].used = true;
    } else {
      selectedTeamOptions[`g-${keyId}-${keyPosition}`] =
        teamOptions[`g-${foundGroup.id}-${position}`];
      teamOptions[`g-${foundGroup.id}-${position}`].used = true;
    }
  } else if (type === "match") {
    const foundMatch = matches[refId];
    let val = null;
    let foundKeyId = null;
    if (rankingPublished) {
      if (
        (position === 1) ===
        foundMatch?.homeTeamScore > foundMatch?.awayTeamScore
      ) {
        // teams[] is obj with key teamId, teamOptions[] obj with key gt.id
        // first retrive gt.id from teams using teamId, then retrieve teamOptions using gt.id
        foundKeyId = teams[foundMatch?.homeTeamId];
      } else {
        foundKeyId = teams[foundMatch?.awayTeamId];
      }
      val = teamOptions[foundKeyId];
      selectedTeamOptions[`g-${keyId}-${keyPosition}`] = val;
      teamOptions[foundKeyId].used = true;
    } else {
      val = teamOptions[`m-${refId}-${position}`];
      selectedTeamOptions[`g-${keyId}-${keyPosition}`] = val;
      teamOptions[`m-${refId}-${position}`].used = true;
    }
  }
};

const populateMatchSelectedOption = (match) => {
  const { id, futureTeamReference } = match;
  // matchTeamTitles[id] = ["Empty Spot", "Empty Spot"]; // Initialize both home and away slots
  // Direct assignment if team names are present, home pos =1, away pos =2
  if (match.homeTeamId && teamOptions[`t-${match.homeTeamId}`]) {
    selectedTeamOptions[`m-${match.id}-1`] =
      teamOptions[`t-${match.homeTeamId}`];
    teamOptions[`t-${match.homeTeamId}`].used = true;
  }
  if (match.awayTeamId && teamOptions[`t-${match.awayTeamId}`]) {
    selectedTeamOptions[`m-${match.id}-2`] =
      teamOptions[`t-${match.awayTeamId}`];
    teamOptions[`t-${match.awayTeamId}`].used = true;
  }
  // reset both options to empty slot
  selectedTeamOptions[`m-${match.id}-1`] = selectedTeamOptions[
    `m-${match.id}-2`
  ] = teamOptions["empty"];

  // Process both home and away references //todo: loop is doing repetitive task
  Object.entries(futureTeamReference || {}).forEach(
    ([teamType, reference], index) => {
      const keyPosition = teamType === "home" ? 1 : 2;
      if (!reference || !reference.id)
        return (selectedTeamOptions[`m-${match.id}-${keyPosition}`] =
          teamOptions["empty"]);

      //for every match, forEach loop will run twice for teamType-home(pos=1)/teamType-away(pos=2)

      const { type, id: refId, position } = reference;
      const rankingPublished = false; // Replace with actual logic

      if (type === "group") {
        const foundGroup = groups[refId];
        const foundTeam = foundGroup?.teams.find(
          (t) => t.teamRanking === position
        );

        let val = null;

        if (rankingPublished) {
          val = teamOptions[`t-${foundTeam.teamId}`];
          teamOptions[`t-${foundTeam.teamId}`].used = true;
        } else {
          val = teamOptions[`g-${foundGroup.id}-${position}`];
          teamOptions[`g-${foundGroup.id}-${position}`].used = true;
        }
        selectedTeamOptions[`m-${match.id}-${keyPosition}`] = val;
      } else if (type === "match") {
        const foundMatch = matches[refId];
        let val = null;
        if (rankingPublished) {
          let foundKeyId = null;
          if (
            (position === 1) ===
            foundMatch?.homeTeamScore > foundMatch?.awayTeamScore
          ) {
            // teams[] is obj with key teamId, teamOptions[] obj with key gt.id
            // first retrive gt.id from teams using teamId, then retrieve teamOptions using gt.id
            foundKeyId = teams[foundMatch?.homeTeamId];
            val = teamOptions[foundKeyId];
          } else {
            foundKeyId = teams[foundMatch?.awayTeamId];
            val = teamOptions[foundKeyId];
          }
          selectedTeamOptions[`m-${match.id}-${keyPosition}`] = val;
          teamOptions[foundKeyId].used = true;
        } else {
          val = teamOptions[`m-${refId}-${position}`];
          selectedTeamOptions[`m-${match.id}-${keyPosition}`] = val;
          (teamOptions[`m-${refId}-${position}`] ??= {}).used = true;
        }
      }
    }
  );
};

// todo: remove bracket match name for round > 0

const fetchData = async () => {
  // todo: fetch participants and map with group teams if group team name/other details needed

  Promise.all([
    store.dispatch("tournament/setTournament", {
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("tournament/setParticipants", {
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("tournamentFormat/setTournamentFormat", {
      tournamentId: route.params.tournamentId,
    }),
  ]);
};

const handleSaveFormat = async () => {
  // await form.value.validate();
  // if (!isFormValid.value) return;

  await store
    .dispatch("tournament/save", tournament.value)
    .then((result) => {});
};

watch(
  () => tournamentFormat.value,
  (newVal) => {
    if (!newVal.length) return;

    // populate groups/teams/matches
    populateTeamOptionsWParticipants();

    newVal.forEach((phase) => {
      phase.items.forEach((phaseItem) => {
        if (phaseItem.type == "group") {
          if (!groups[phaseItem.id]) {
            groups[phaseItem.id] = phaseItem;
          }
          if (phaseItem.teams?.length) {
            phaseItem.teams.forEach((team) => {
              if (team.teamId && !teams[team.teamId]) {
                teams[team.teamId] = team;
              }
            });
          }
        } else if (phaseItem.type == "single_match") {
          if (!matches[phaseItem.id]) {
            matches[phaseItem.id] = phaseItem;
          }
        } else if (phaseItem.type == "bracket") {
          if (phaseItem.rounds?.length) {
            phaseItem.rounds.forEach((round) => {
              round.matches.forEach((match) => {
                if (!matches[match.id]) {
                  matches[match.id] = match;
                }
              });
            });
          }
        }
      });
    });
    // populate selectedTeamOptions
    newVal.forEach((phase) => {
      phase.items.forEach((phaseItem, phaseIndex) => {
        if (phaseItem.type == "group" && phaseItem.teams?.length) {
          // phaseItem.teams.forEach((team) => {
          //   populateGroupSelectedOption(team);
          // });
          populateTeamOptions(phaseItem, phase.id);
        } else if (phaseItem.type == "single_match") {
          // populateMatchSelectedOption(phaseItem);
          populateTeamOptions(phaseItem, phase.id);
        } else if (phaseItem.type == "bracket") {
          if (phaseItem.rounds?.length) {
            phaseItem.rounds.forEach((round) => {
              round.matches.forEach((match) => {
                // populateMatchSelectedOption(match);
                match.type = "single_match";
                populateTeamOptions(match, phase.id);
              });
            });
          }
        }
      });
    });
  },
  { deep: false }
);

onMounted(async () => {
  fetchData();
});
</script>

<template>
<!--  <pre>-->
<!--    {{ teamOptions }}-->
    <!--    {{ selectedTeamOptions }}-->
<!--  </pre>-->
  <v-container>
    <v-row>
      <v-col>
        <page-title
          justify="space-between"
          :sub-title="tournament.name"
          title="Format"
          show-back
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
    <pre>
<!--              {{ teamOptions }}-->
    </pre>
    <v-row justify="center">
      <v-col col="12">
        <!--        {{groups}}-->

        <tournament-base-format
          v-if="!Array.isArray(tournamentFormat)"
          v-model="tournament.formatShortcode"
          title="Format Structure"
        ></tournament-base-format>
        <v-row v-else>
          <template v-for="(phase, phaseIndex) in tournamentFormat">
            <v-col cols="12" :md="calcPhaseColWrapper[phaseIndex]">
              <h3 class="pb-2">{{ phase.name }}</h3>

              <v-row v-for="(phaseItem, itemIndex) in phase.items">
                <v-col>
                  <!--                if group-->
                  <template v-if="phaseItem.type == 'group'">
                    <v-row>
                      <v-col :cols="11" :md="calcPhaseCol(phaseIndex)">
                        <v-card density="compact">
                          <v-card-title class="bg-secondary">
                            <v-text-field
                              v-model="phaseItem.name"
                              density="compact"
                              variant="plain"
                              hide-details="auto"
                              center-affix
                            ></v-text-field>
                          </v-card-title>
                          <v-card-text>
                            <!--                      TODO: replace id with name-->
                            <template
                              v-for="(team, teamIndex) in phaseItem.teams"
                            >
                              <v-select
                                :model-value="
                                  selectedTeamOptions[
                                    `g-${phaseItem.id}-${teamIndex + 1}`
                                  ]
                                "
                                :items="visibleTeamOptions"
                                item-title="name"
                                item-value="id"
                                return-object
                                density="compact"
                                variant="plain"
                                hide-details="auto"
                                center-affix
                                @update:menu="
                                  updateTeamOptionsMenu({
                                    id: `g-${phaseItem.id}-${teamIndex + 1}`,
                                    isMenuOpen: $event,
                                  })
                                "
                                @update:model-value="
                                  updateSelectedTeamOption({
                                    newSelection: $event,
                                    prevKey: `g-${phaseItem.id}-${
                                      teamIndex + 1
                                    }`,
                                  })
                                "
                              ></v-select>
                            </template>
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </v-row>
                  </template>

                  <!--                if bracket-->
                  <template v-if="phaseItem.type == 'bracket'">
                    <v-card density="compact">
                      <v-card-title class="bg-primary">
                        <v-text-field
                          v-model="phaseItem.name"
                          density="compact"
                          variant="plain"
                          hide-details="auto"
                          center-affix
                        ></v-text-field>
                      </v-card-title>
                      <v-row no-gutters class="pb-3">
                        <v-col
                          :cols="11"
                          :md="calcPhaseCol(phaseIndex)"
                          v-for="(round, roundIndex) in phaseItem.rounds"
                        >
                          <h4 class="py-2 pl-4 font-weight-medium">
                            {{ getRoundTitle(round.type) }}
                          </h4>

                          <v-row v-for="(match, matchIndex) in round.matches">
                            <v-col :cols="11" class="mx-auto">
                              <v-card density="compact">
                                <v-card-title class="bg-tertiary">
                                  <v-text-field
                                    v-model="match.name"
                                    density="compact"
                                    variant="plain"
                                    hide-details="auto"
                                    center-affix
                                  ></v-text-field>
                                </v-card-title>
                                <v-card-text>
                                  <v-select
                                    :model-value="
                                      selectedTeamOptions[`m-${match.id}-1`]
                                    "
                                    :items="visibleTeamOptions"
                                    :disabled="roundIndex > 0"
                                    item-title="name"
                                    item-value="id"
                                    return-object
                                    density="compact"
                                    variant="plain"
                                    hide-details="auto"
                                    center-affix
                                    @update:menu="
                                      updateTeamOptionsMenu({
                                        id: `m-${match.id}-1`,
                                        isMenuOpen: $event,
                                      })
                                    "
                                    @update:model-value="
                                      updateSelectedTeamOption({
                                        newSelection: $event,
                                        prevKey: `m-${match.id}-1`,
                                      })
                                    "
                                  ></v-select>
                                  <v-select
                                    :model-value="
                                      selectedTeamOptions[`m-${match.id}-2`]
                                    "
                                    :items="visibleTeamOptions"
                                    :disabled="roundIndex > 0"
                                    item-title="name"
                                    item-value="id"
                                    return-object
                                    density="compact"
                                    variant="plain"
                                    hide-details="auto"
                                    center-affix
                                    @update:menu="
                                      updateTeamOptionsMenu({
                                        id: `m-${match.id}-2`,
                                        isMenuOpen: $event,
                                      })
                                    "
                                    @update:model-value="
                                      updateSelectedTeamOption({
                                        newSelection: $event,
                                        prevKey: `m-${match.id}-2`,
                                      })
                                    "
                                  ></v-select>
                                </v-card-text>
                              </v-card>
                            </v-col>
                          </v-row>
                        </v-col>
                      </v-row>
                    </v-card>
                  </template>

                  <!--                if single_match-->
                  <template v-if="phaseItem.type == 'single_match'">
                    <v-row>
                      <v-col cols="11" :md="calcPhaseCol(phaseIndex)">
                        <v-card density="compact">
                          <v-card-title class="bg-tertiary">
                            <v-text-field
                              v-model="match.name"
                              density="compact"
                              variant="plain"
                              hide-details="auto"
                              center-affix
                            ></v-text-field>
                          </v-card-title>
                          <v-card-text>
                            <v-select
                              :model-value="
                                selectedTeamOptions[`m-${phaseItem.id}-1`]
                              "
                              :items="visibleTeamOptions"
                              item-title="name"
                              item-value="id"
                              return-object
                              density="compact"
                              variant="plain"
                              hide-details="auto"
                              center-affix
                              @update:menu="
                                updateTeamOptionsMenu({
                                  id: `m-${phaseItem.id}-1`,
                                  isMenuOpen: $event,
                                })
                              "
                              @update:model-value="
                                updateSelectedTeamOption({
                                  newSelection: $event,
                                  prevKey: `m-${phaseItem.id}-1`,
                                })
                              "
                            ></v-select>
                            <v-select
                              :model-value="
                                selectedTeamOptions[`m-${phaseItem.id}-2`]
                              "
                              :items="visibleTeamOptions"
                              item-title="name"
                              item-value="id"
                              return-object
                              density="compact"
                              variant="plain"
                              hide-details="auto"
                              center-affix
                              @update:menu="
                                updateTeamOptionsMenu({
                                  id: `m-${phaseItem.id}-2`,
                                  isMenuOpen: $event,
                                })
                              "
                              @update:model-value="
                                updateSelectedTeamOption({
                                  newSelection: $event,
                                  prevKey: `m-${phaseItem.id}-2`,
                                })
                              "
                            ></v-select>
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </v-row>
                  </template>
                </v-col>
              </v-row>
            </v-col>
          </template>
        </v-row>

        <div class="d-flex align-center mt-3 mt-md-4">
          <v-spacer></v-spacer>
          <v-btn
            :density="xs ? 'comfortable' : 'default'"
            color="primary"
            type="submit"
            @click="handleSaveFormat"
            >Save
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style>
.v-card-text {
  padding-bottom: 0px !important;
}
</style>
