<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import TournamentBaseFormat from "@/components/TournamentBaseFormat.vue";
import { useDisplay } from "vuetify";
import {calcMatchType, getRoundTitle} from "@/others/util";

const route = useRoute();
const store = useStore();
const { xs, width, name } = useDisplay();

const tournament = computed(() => store.state.tournament.tournament);
const tournamentFormat = computed(
  () => store.state.tournamentFormat.tournamentFormat,
);
const participants = computed(() => store.state.tournamentFormat.participants);
const teamOptions = computed(() => store.state.tournamentFormat.teamOptions);
const selectedTeamOptions = computed(
  () => store.state.tournamentFormat.selectedTeamOptions,
);
const entityLastCount = computed(
  () => store.state.tournamentFormat.entityLastCount,
);
const visibleTeamOptions = ref([]);

const phaseSingleColUnit = ref(3);
const calcPhaseColWrapper = computed(() => {
  if (tournamentFormat.value?.length > 0) {
    return tournamentFormat.value.map((phase) => {
      const maxRoundLength = phase.items
        .filter((item) => item.type === "bracket")
        .reduce((max, item) => Math.max(max, item.rounds.length), 0);
      return maxRoundLength
        ? maxRoundLength * phaseSingleColUnit.value
        : phaseSingleColUnit.value;
    });
  } else return 0;
});

// in case bracket with more round, calc each phase item width
const calcPhaseCol = (index) => {
  return 12 / (calcPhaseColWrapper.value[index] / phaseSingleColUnit.value);
};

const bracketTeamOptions = [64, 32, 16, 8, 4, 2];

const updateSelectedTeamOption = ({ newSelection, host }) => {
  const hostKey = `${host.type[0]}-${host.id}-${host.position}`; //type[0] return the first letter
  if (newSelection.id === hostKey) return;

  // if empty slot selected, make prev teamOptions[id].used = false; else true
  const prevSelection = { ...selectedTeamOptions.value[hostKey] };

  if (newSelection.id === "empty") {
    // check if item valid & not deleted
    if (teamOptions.value[prevSelection.id])
      teamOptions.value[prevSelection.id].used = false;
  } else if (teamOptions.value[prevSelection.id]?.id === "empty") {
    teamOptions.value[newSelection.id].used = true;
  } else {
    // make old selection used = false, new selection used = true
    teamOptions.value[prevSelection.id].used = false;
    teamOptions.value[newSelection.id].used = true;
  }
  //update model value & preserve host.groupTeamId in frontend to avoid duplicate insert in gt table
  selectedTeamOptions.value[hostKey] = {
    ...newSelection,
    groupTeamId: prevSelection.groupTeamId,
  };

  if (host.type === "group") {
    const updateGroupTeam = {
      teamRanking: host.position,
      tournamentGroupId: host.id,
    };
    const groupTeamId = selectedTeamOptions.value[hostKey]?.groupTeamId || null;
    if (groupTeamId) updateGroupTeam.id = groupTeamId;

    // find match.id with pos to update from host.groupMatches
    // set match->futureTeamReference from updateGroupTeam->futureTeamReference
    if (updateGroupTeam.id) {
      const updateMatches = [];
      host.groupMatches.forEach((match, matchIndex) => {
        if (newSelection.id === "empty") {
          updateGroupTeam.teamId = null;
          updateMatches.push({
            id: match.id,
            homeTeamId: null,
            awayTeamId: null,
            futureTeamReference: null,
          });
        } else if (
          match.groupTeamReference?.home?.groupTeamId === updateGroupTeam.id
        ) {
          if (newSelection.type === "team") {
            updateGroupTeam.teamId = newSelection.itemId;
            updateMatches.push({
              id: match.id,
              homeTeamId: newSelection.itemId,
              futureTeamReference: null,
            });
          } else if (
            newSelection.type === "group" ||
            newSelection.type === "match"
          ) {
            updateGroupTeam.teamId = null;
            updateMatches.push({
              id: match.id,
              homeTeamId: null,
              futureTeamReference: {
                ...match.futureTeamReference,
                home: {
                  type: newSelection.type,
                  id: newSelection.itemId,
                  position: newSelection.position,
                },
              },
            });
          }
        } else if (
          match.groupTeamReference?.away?.groupTeamId === updateGroupTeam.id
        ) {
          if (newSelection.type === "team") {
            updateGroupTeam.teamId = newSelection.itemId;
            updateMatches.push({
              id: match.id,
              awayTeamId: newSelection.itemId,
              futureTeamReference: null,
            });
          } else if (
            newSelection.type === "group" ||
            newSelection.type === "match"
          ) {
            updateGroupTeam.teamId = null;
            updateMatches.push({
              id: match.id,
              awayTeamId: null,
              futureTeamReference: {
                ...match.futureTeamReference,
                away: {
                  type: newSelection.type,
                  id: newSelection.itemId,
                  position: newSelection.position,
                },
              },
            });
          }
        }
      });
      store.dispatch("tournamentFormat/updateGroupMatches", {
        matches: updateMatches,
      });
      store.dispatch("tournamentFormat/saveGroupTeam", {
        updateGroupTeam,
      });
    }
  } else if (host.type === "match") {
    const updateMatch = {
      id: host.id,
    };
    if (newSelection.type === "team") {
      if (host.position === 1) {
        updateMatch.homeTeamId = newSelection.itemId || null;
        updateMatch.futureTeamReference = {
          ...host.futureTeamReference,
          home: null,
        };
      } else if (host.position === 2) {
        updateMatch.awayTeamId = newSelection.itemId || null;
        updateMatch.futureTeamReference = {
          ...host.futureTeamReference,
          away: null,
        };
      }
    } else {
      if (host.position === 1) {
        updateMatch.futureTeamReference =
          newSelection.type === "group" || newSelection.type === "match"
            ? {
                ...host.futureTeamReference,
                home: {
                  type: newSelection.type,
                  id: newSelection.itemId,
                  position: newSelection.position,
                },
              }
            : {
                ...host.futureTeamReference,
                home: null,
              };
        updateMatch.homeTeamId = updateMatch.awayTeamId = null;
      } else if (host.position === 2) {
        updateMatch.futureTeamReference =
          newSelection.type === "group" || newSelection.type === "match"
            ? {
                ...host.futureTeamReference,
                away: {
                  type: newSelection.type,
                  id: newSelection.itemId,
                  position: newSelection.position,
                },
              }
            : {
                ...host.futureTeamReference,
                away: null,
              };
        updateMatch.homeTeamId = updateMatch.awayTeamId = null;
      }
    }
    store.dispatch("tournamentFormat/updateMatch", {
      newMatch: updateMatch,
      tournamentId: route.params.tournamentId,
    });
  }
};

const updateTeamOptionsMenu = ({ id, isMenuOpen }) => {
  if (isMenuOpen) {
    const foundOption = teamOptions.value[id];
    visibleTeamOptions.value = Object.values(teamOptions.value)
      .filter((item) => item.phase < foundOption?.phase)
      .filter((item) => !item.used);
  }
};

const fetchData = async () => {
  return Promise.all([
    store.dispatch("tournament/setTournamentWEmailOptionalById", {
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("tournamentFormat/setTournamentFormat", {
      tournamentId: route.params.tournamentId,
    }),
  ]);
};
const newPhaseInit = {
  name: null,
  order: null,
  tournamentId: null,
};
const newPhase = reactive({ ...newPhaseInit });

const addPhase = async () => {
  newPhase.name = `Phase ${entityLastCount.value.phase}`;
  newPhase.order = entityLastCount.value.phase;
  newPhase.tournamentId = route.params.tournamentId;

  store
    .dispatch("tournamentFormat/addPhase", {
      newPhase,
      tournamentId: route.params.tournamentId,
    })
    .then(() => {
      Object.assign(newPhase, { ...newPhaseInit });
    });
};
const newGroupInit = {
  name: null,
  teamsPerGroup: null,
  doubleRoundRobin: false,
  order: null,
  tournamentPhaseId: null,
};
const newGroup = reactive({ ...newGroupInit });
const openAddGroup = ({ order, phaseId }) => {
  addGroupDialog.value = !addGroupDialog.value;
  newGroup.name = `Group ${entityLastCount.value.group}`;
  newGroup.tournamentPhaseId = phaseId;
  newGroup.order = order;
};
const addGroup = async ({ phaseId }) => {
  await form.value.validate();
  if (!isFormValid.value) return;

  store
    .dispatch("tournamentFormat/addGroup", {
      newGroup,
      match: { count: entityLastCount.value.match },
      tournamentId: route.params.tournamentId,
    })
    .then(() => {
      Object.assign(newGroup, { ...newGroupInit });
    })
    .finally(() => (addGroupDialog.value = !addGroupDialog.value));
};

const newBracketInit = {
  name: null,
  order: null,
  teamsCount: null,
  tournamentPhaseId: null,
};
const newBracket = reactive({ ...newBracketInit });

const openAddBracket = ({ order, phaseId }) => {
  addBracketDialog.value = !addBracketDialog.value;

  newBracket.name = `Bracket ${entityLastCount.value.bracket}`;
  newBracket.order = order;
  newBracket.tournamentPhaseId = phaseId;
};
const addBracket = async () => {
  await form.value.validate();
  if (!isFormValid.value) return;

  store
    .dispatch("tournamentFormat/addBracket", {
      newBracket,
      match: { count: entityLastCount.value.match },
      tournamentId: route.params.tournamentId,
    })
    .then(() => {
      Object.assign(newBracket, { ...newBracketInit });
    })
    .finally(() => (addBracketDialog.value = !addBracketDialog.value));
};

const newMatchInit = {
  name: null,
  order: null,
  type: null,
  futureTeamReference: null,
  roundType: null,
  startTime: null,
  homeTeamId: null,
  awayTeamId: null,
  phaseId: null,
  groupId: null,
  bracketId: null,
  tournamentId: route.params.tournamentId,
};
const newMatch = reactive({ ...newMatchInit });
const addMatch = ({ order, phaseId }) => {
  newMatch.name = `Match ${entityLastCount.value.match}`;
  newMatch.order = order;
  newMatch.type = "single_match";
  newMatch.phaseId = phaseId;

  store
    .dispatch("tournamentFormat/addMatch", {
      newMatch,
      tournamentId: route.params.tournamentId,
    })
    .then(() => {
      Object.assign(newMatch, { ...newMatchInit });
    });
};

const addGroupDialog = ref(false);
const addBracketDialog = ref(false);

const form = ref(null);
const isFormValid = ref(true);

const removePhase = ({ phaseId }) => {
  store.dispatch("tournamentFormat/removePhase", {
    phaseId,
    tournamentId: route.params.tournamentId,
  });
};
const removeGroup = ({ groupId }) => {
  store.dispatch("tournamentFormat/removeGroup", {
    groupId,
    tournamentId: route.params.tournamentId,
  });
};
const removeBracket = ({ bracketId }) => {
  store.dispatch("tournamentFormat/removeBracket", {
    bracketId,
    tournamentId: route.params.tournamentId,
  });
};
const removeMatch = ({ matchId }) => {
  store.dispatch("tournamentFormat/removeMatch", {
    matchId,
    tournamentId: route.params.tournamentId,
  });
};
const tournamentBaseFormat = reactive({
  groupCount: null,
  groupMemberCount: null,
  knockoutMemberCount: null,
});
const updatedBaseFormat = async (tournamentBaseFormat) => {
  if (
    tournamentBaseFormat.groupCount &&
    tournamentBaseFormat.knockoutMemberCount
  ) {
    await store.dispatch("tournamentFormat/createGroupKnockoutPhase", {
      tournamentBaseFormat,
      entityLastCount: entityLastCount.value,
      tournamentId: route.params.tournamentId,
    });
  } else if (tournamentBaseFormat.groupCount) {
    await store.dispatch("tournamentFormat/createGroupPhase", {
      tournamentBaseFormat,
      entityLastCount: entityLastCount.value,
      tournamentId: route.params.tournamentId,
    });
  } else if (tournamentBaseFormat.knockoutMemberCount) {
    await store.dispatch("tournamentFormat/createKnockoutPhase", {
      tournamentBaseFormat,
      entityLastCount: entityLastCount.value,
      tournamentId: route.params.tournamentId,
    });
  }
};
const updatePhase = ({ phase }) => {
  const newPhase = { id: phase.id, name: phase.name };
  store.dispatch("tournamentFormat/updatePhase", {
    newPhase,
    tournamentId: route.params.tournamentId,
    onlyEntitySave: true,
  });
};
const updateGroup = ({ group }) => {
  const newGroup = { id: group.id, name: group.name };
  store.dispatch("tournamentFormat/updateGroup", {
    newGroup,
    tournamentId: route.params.tournamentId,
    onlyEntitySave: true,
  });
};
const updateBracket = ({ bracket }) => {
  const newBracket = { id: bracket.id, name: bracket.name };
  store.dispatch("tournamentFormat/updateBracket", {
    newBracket,
    tournamentId: route.params.tournamentId,
    onlyEntitySave: true,
  });
};
const updateMatch = ({ match }) => {
  const newMatch = { id: match.id, name: match.name };
  store.dispatch("tournamentFormat/updateMatch", {
    newMatch,
    tournamentId: route.params.tournamentId,
    onlyEntitySave: true,
  });
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
          title="Format"
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

    <v-row v-if="tournamentFormat.length < 1">
      <v-col>
        <tournament-base-format
          @update:model-value="updatedBaseFormat"
        ></tournament-base-format>
      </v-col>
    </v-row>

    <v-row v-else justify="center">
      <v-col col="12">
        <v-row class="scrollable-container">
          <template v-for="(phase, phaseIndex) in tournamentFormat">
            <v-col :cols="calcPhaseColWrapper[phaseIndex]" class="max-content">
              <div
                class="d-flex justify-start align-center bg-amber-accent-1 rounded px-4 py-2 mb-4"
              >
                <v-text-field
                  v-model="phase.name"
                  center-affix
                  density="compact"
                  hide-details="auto"
                  variant="plain"
                  @blur="updatePhase({ phase })"
                ></v-text-field>
                <v-btn
                  class="rounded"
                  density="comfortable"
                  icon="mdi-delete-outline"
                  size="small"
                  tile
                  variant="tonal"
                  @click="removePhase({ phaseId: phase.id })"
                ></v-btn>
              </div>

              <template v-if="phase.items.length > 0">
                <v-row v-for="(phaseItem, itemIndex) in phase.items">
                  <v-col>
                    <!--                if group-->
                    <template v-if="phaseItem.type === 'group'">
                      <v-row>
                        <v-col :cols="calcPhaseCol(phaseIndex)" draggable>
                          <v-card density="compact">
                            <v-card-title
                              :class="`${calcMatchType(phaseItem.type).bgColor} d-flex justify-space-around align-center`"
                            >
                              <v-text-field
                                v-model="phaseItem.name"
                                center-affix
                                density="compact"
                                hide-details="auto"
                                variant="plain"
                                @blur="updateGroup({ group: phaseItem })"
                              ></v-text-field>
                              <div>
                                <v-btn
                                  class="rounded"
                                  density="comfortable"
                                  icon="mdi-delete-outline"
                                  size="small"
                                  tile
                                  variant="tonal"
                                  @click="
                                    removeGroup({ groupId: phaseItem.id })
                                  "
                                ></v-btn>
                              </div>
                            </v-card-title>
                            <v-card-text>
                              <!--                      TODO: replace id with name-->
                              <template
                                v-for="iterationCount in phaseItem.teamsPerGroup"
                              >
                                <!--                                {{`g-${phaseItem.id}-${iterationCount}`}}-->
                                <v-select
                                  :disabled="phaseItem?.rankingPublished"
                                  :items="visibleTeamOptions"
                                  :model-value="
                                    selectedTeamOptions[
                                      `g-${phaseItem.id}-${iterationCount}`
                                    ]
                                  "
                                  center-affix
                                  density="compact"
                                  hide-details="auto"
                                  item-title="name"
                                  item-value="id"
                                  return-object
                                  variant="plain"
                                  @update:menu="
                                    updateTeamOptionsMenu({
                                      id: `g-${phaseItem.id}-${iterationCount}`,
                                      isMenuOpen: $event,
                                    })
                                  "
                                  @update:model-value="
                                    updateSelectedTeamOption({
                                      newSelection: $event,
                                      host: {
                                        type: 'group',
                                        id: phaseItem.id,
                                        position: iterationCount,
                                        groupMatches: phaseItem.matches,
                                      },
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
                    <template v-if="phaseItem.type === 'bracket'">
                      <v-card density="compact">
                        <v-card-title
                          :class="`${calcMatchType(phaseItem.type).bgColor}  d-flex justify-space-around align-center`"
                        >
                          <v-text-field
                            v-model="phaseItem.name"
                            center-affix
                            density="compact"
                            hide-details="auto"
                            variant="plain"
                            @blur="updateBracket({ bracket: phaseItem })"
                          ></v-text-field>
                          <div>
                            <v-btn
                              class="rounded"
                              density="comfortable"
                              icon="mdi-delete-outline"
                              size="small"
                              tile
                              variant="tonal"
                              @click="
                                removeBracket({ bracketId: phaseItem.id })
                              "
                            ></v-btn>
                          </div>
                        </v-card-title>
                        <v-row class="pb-3" no-gutters>
                          <v-col
                            v-for="(round, roundIndex) in phaseItem.rounds"
                            :cols="calcPhaseCol(phaseIndex)"
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
                                      center-affix
                                      density="compact"
                                      hide-details="auto"
                                      variant="plain"
                                      @blur="updateMatch({ match })"
                                    ></v-text-field>
                                  </v-card-title>
                                  <v-card-text>
                                    <v-select
                                      :disabled="
                                        roundIndex > 0 ||
                                        match?.rankingPublished
                                      "
                                      :items="visibleTeamOptions"
                                      :model-value="
                                        selectedTeamOptions[`m-${match.id}-1`]
                                      "
                                      center-affix
                                      density="compact"
                                      hide-details="auto"
                                      item-title="name"
                                      item-value="id"
                                      return-object
                                      variant="plain"
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
                                          host: {
                                            type: 'match',
                                            id: match.id,
                                            position: 1,
                                            futureTeamReference:
                                              match.futureTeamReference,
                                          },
                                        })
                                      "
                                    ></v-select>

                                    <v-select
                                      :disabled="
                                        roundIndex > 0 ||
                                        match?.rankingPublished
                                      "
                                      :items="visibleTeamOptions"
                                      :model-value="
                                        selectedTeamOptions[`m-${match.id}-2`]
                                      "
                                      center-affix
                                      density="compact"
                                      hide-details="auto"
                                      item-title="name"
                                      item-value="id"
                                      return-object
                                      variant="plain"
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
                                          host: {
                                            type: 'match',
                                            id: match.id,
                                            position: 2,
                                            futureTeamReference:
                                              match.futureTeamReference,
                                          },
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
                    <template v-if="phaseItem.type === 'single_match'">
                      <v-row>
                        <v-col :cols="calcPhaseCol(phaseIndex)">
                          <v-card density="compact">
                            <v-card-title
                              :class="`${calcMatchType(phaseItem.type).bgColor}  d-flex justify-space-around align-center`"
                            >
                              <v-text-field
                                v-model="phaseItem.name"
                                center-affix
                                density="compact"
                                hide-details="auto"
                                variant="plain"
                                @blur="updateMatch({ match: phaseItem })"
                              ></v-text-field>
                              <div>
                                <v-btn
                                  class="rounded"
                                  density="comfortable"
                                  icon="mdi-delete-outline"
                                  size="small"
                                  tile
                                  variant="tonal"
                                  @click="
                                    removeMatch({ matchId: phaseItem.id })
                                  "
                                ></v-btn>
                              </div>
                            </v-card-title>
                            <v-card-text>
                              <v-select
                                :disabled="phaseItem.rankingPublished"
                                :items="visibleTeamOptions"
                                :model-value="
                                  selectedTeamOptions[`m-${phaseItem.id}-1`]
                                "
                                center-affix
                                density="compact"
                                hide-details="auto"
                                item-title="name"
                                item-value="id"
                                return-object
                                variant="plain"
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
                                    host: {
                                      type: 'match',
                                      id: phaseItem.id,
                                      position: 1,
                                      futureTeamReference:
                                        phaseItem.futureTeamReference,
                                    },
                                  })
                                "
                              ></v-select>
                              <v-select
                                :disabled="phaseItem.rankingPublished"
                                :items="visibleTeamOptions"
                                :model-value="
                                  selectedTeamOptions[`m-${phaseItem.id}-2`]
                                "
                                center-affix
                                density="compact"
                                hide-details="auto"
                                item-title="name"
                                item-value="id"
                                return-object
                                variant="plain"
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
                                    host: {
                                      type: 'match',
                                      id: phaseItem.id,
                                      position: 2,
                                      futureTeamReference:
                                        phaseItem.futureTeamReference,
                                    },
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
              </template>

              <div class="d-flex pt-4">
                <v-btn
                  density="comfortable"
                  prepend-icon="mdi-plus"
                  size="x-small"
                  stacked
                  @click="
                    openAddGroup({
                      order: phase.items.length + 1,
                      phaseId: phase.id,
                    })
                  "
                  >Group
                </v-btn>
                <v-btn
                  density="comfortable"
                  prepend-icon="mdi-plus"
                  size="x-small"
                  stacked
                  @click="
                    openAddBracket({
                      order: phase.items.length + 1,
                      phaseId: phase.id,
                    })
                  "
                  >Bracket
                </v-btn>
                <v-btn
                  density="comfortable"
                  prepend-icon="mdi-plus"
                  size="x-small"
                  stacked
                  @click="
                    addMatch({
                      order: phase.items.length + 1,
                      phaseId: phase.id,
                    })
                  "
                  >Match
                </v-btn>
              </div>
            </v-col>
          </template>
          <v-col>
            <v-btn prepend-icon="mdi-plus" stacked @click="addPhase">
              Phase
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>

  <v-dialog v-model="addGroupDialog" width="350">
    <v-card title="Add Group">
      <v-card-text>
        <v-form
          ref="form"
          v-model="isFormValid"
          fast-fail
          @submit.prevent="addGroup"
        >
          <v-text-field
            v-model="newGroup.name"
            :rules="[(v) => !!v || 'Name is required!']"
            class="mt-2"
            clearable
            hide-details="auto"
            label="Name"
            variant="solo"
          ></v-text-field>
          <v-text-field
            v-model="newGroup.teamsPerGroup"
            :rules="[(v) => !!v || 'Teams count is required!']"
            class="mt-2"
            clearable
            hide-details="auto"
            label="Teams Per Group"
            type="number"
            variant="solo"
          ></v-text-field>
          <v-switch
            v-model="newGroup.doubleRoundRobin"
            color="primary"
            label="Double Round Robin?"
          ></v-switch>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              :density="xs ? 'comfortable' : 'default'"
              color="primary"
              type="submit"
              >Submit
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog v-model="addBracketDialog" width="350">
    <v-card title="Add Bracket">
      <v-card-text>
        <v-form
          ref="form"
          v-model="isFormValid"
          fast-fail
          @submit.prevent="addBracket"
        >
          <v-text-field
            v-model="newBracket.name"
            :rules="[(v) => !!v || 'Name is required!']"
            class="mt-2"
            clearable
            hide-details="auto"
            label="Name"
            variant="solo"
          ></v-text-field>
          <v-select
            v-model="newBracket.teamsCount"
            :items="bracketTeamOptions"
            :rules="[(v) => !!v || 'Teams count is required!']"
            class="mt-2"
            clearable
            hide-details="auto"
            label="Number of Teams"
            variant="solo"
          ></v-select>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              :density="xs ? 'comfortable' : 'default'"
              color="primary"
              type="submit"
              >Submit
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style>
.format .v-col {
  max-width: 100% !important;
}
</style>
