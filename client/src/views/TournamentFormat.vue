<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import TournamentBaseFormat from "@/components/TournamentBaseFormat.vue";
import { useDisplay } from "vuetify";

const route = useRoute();
const store = useStore();
const { xs } = useDisplay();

const tournament = computed(() => store.state.tournament.tournament);
const tournamentFormat = computed(
  () => store.state.tournamentFormat.tournamentFormat
);
const participants = computed(() => store.state.tournamentFormat.participants);
const groups = computed(() => store.state.tournamentFormat.groups);
const teams = computed(() => store.state.tournamentFormat.teams);
const matches = computed(() => store.state.tournamentFormat.matches);
const teamOptions = computed(() => store.state.tournamentFormat.teamOptions);
const selectedTeamOptions = computed(
  () => store.state.tournamentFormat.selectedTeamOptions
);
const entityCount = computed(() => store.state.tournamentFormat.entityCount);
const visibleTeamOptions = ref([]);

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

const updateSelectedTeamOption = ({ newSelection, prevKey }) => {
  if (newSelection.id == prevKey) return;
  // if empty slot selected, make prev teamOptions[id].used = false; else true
  const targetSelectedOptionKey = selectedTeamOptions.value[prevKey].id;
  if (newSelection.id === "empty") {
    teamOptions.value[targetSelectedOptionKey].used = false;
  } else if (teamOptions.value[targetSelectedOptionKey].id === "empty") {
    teamOptions.value[newSelection.id].used = true;
  } else {
    // make old selection used = false, new selection used = true
    teamOptions.value[targetSelectedOptionKey].used = false;
    teamOptions.value[newSelection.id].used = true;
  }
  // teamOptions.value[targetSelectedOptionKey].used = newSelection.id !== "empty";

  //update model value
  selectedTeamOptions.value[prevKey] = newSelection;
};

const updateTeamOptionsMenu = ({ id, isMenuOpen }) => {
  if (isMenuOpen) {
    const foundOption = teamOptions.value[id];
    visibleTeamOptions.value = Object.values(teamOptions.value)
      .filter((item) => {
        return item.phase < foundOption?.phase;
      })
      .filter((item) => !item.used);
  }
};

// todo: remove bracket match name for round > 0

const fetchData = async () => {
  // todo: fetch participants and map with group teams if group team name/other details needed

  Promise.all([
    store.dispatch("tournamentFormat/setTournamentFormat", {
      tournamentId: route.params.tournamentId,
    }),
  ]);
};

const addPhase = () => {
  const newPhase = {
    name: entityCount.value.phaseOrder + 1,
    phaseOrder: entityCount.value.phaseOrder + 1,
    tournamentId: route.params.tournamentId,
  };
  store.dispatch("tournamentFormat/addPhase", newPhase).then(() => {
    entityCount.value.phaseOrder++;
  });
};

const handleSaveFormat = async () => {
  // await form.value.validate();
  // if (!isFormValid.value) return;

  await store
    .dispatch("tournament/save", tournament.value)
    .then((result) => {});
};

onMounted(async () => {
  fetchData();
});
</script>

<template>
  <!--  <pre>-->
  <!--      {{ tournamentFormat }}-->
  <!--      &lt;!&ndash;      {{ selectedTeamOptions }}&ndash;&gt;-->
  <!--    </pre>-->
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
    <v-row justify="center">
      <v-col col="12" class="scrollable-container">
        <!--        {{groups}}-->

        <!--        <tournament-base-format-->
        <!--          v-if="!Array.isArray(tournamentFormat)"-->
        <!--          v-model="tournament.formatShortcode"-->
        <!--          title="Format Structure"-->
        <!--        ></tournament-base-format>-->

        <v-row>
          <template v-for="(phase, phaseIndex) in tournamentFormat">
            <v-col cols="12" :md="calcPhaseColWrapper[phaseIndex]">
              <v-text-field
                v-model="phase.name"
                density="compact"
                variant="plain"
                hide-details="auto"
                center-affix
              ></v-text-field>

              <template v-if="phase.items.length > 0">
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
                                  :disabled="
                                    groups[phaseItem.id].rankingPublished
                                  "
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
                                    {{ phaseItem.rankingPublished }}
                                    <v-select
                                      :model-value="
                                        selectedTeamOptions[`m-${match.id}-1`]
                                      "
                                      :items="visibleTeamOptions"
                                      :disabled="
                                        roundIndex > 0 ||
                                        matches[match.id].rankingPublished
                                      "
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
                                    {{ phaseItem.rankingPublished }}
                                    <v-select
                                      :model-value="
                                        selectedTeamOptions[`m-${match.id}-2`]
                                      "
                                      :items="visibleTeamOptions"
                                      :disabled="
                                        roundIndex > 0 ||
                                        matches[match.id].rankingPublished
                                      "
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
                                v-model="phaseItem.name"
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
                                :disabled="
                                  matches[phaseItem.id].rankingPublished
                                "
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
                                :disabled="
                                  matches[phaseItem.id].rankingPublished
                                "
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
              </template>
            </v-col>
          </template>
          <v-col>
            <v-btn
              stacked
              prepend-icon="mdi-plus"
              @click="addPhase"
              class="mt-4 mt-md-8"
            >
              Add Phase
            </v-btn>
          </v-col>
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
.scrollable-container {
  overflow-x: auto; /* Allows horizontal scrolling */
  white-space: nowrap; /* Prevents wrapping of child elements */
}

.scrollable-container .v-row {
  flex-wrap: nowrap; /* Prevents row from wrapping */
  /* width: max-content; /* Ensures the row expands based on its content */
}

.v-card-text {
  padding-bottom: 0px !important;
}
</style>
