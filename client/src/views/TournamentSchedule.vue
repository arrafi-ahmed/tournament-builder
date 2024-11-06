<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import NoItems from "@/components/NoItems.vue";
import { calcMatchType, getTimeOnly } from "@/others/util";
import { useDisplay } from "vuetify";
import TimePicker from "@/components/TimePicker.vue";

const router = useRouter();
const route = useRoute();
const store = useStore();
const { xs } = useDisplay();

const tournament = computed(() => store.state.tournament.tournament);
const schedule = computed(() => store.state.tournamentSchedule.schedule);
const unplannedMatches = computed(
  () => store.state.tournamentSchedule.unplannedMatches,
);
const fields = computed(() => store.state.tournamentSchedule.fields);
const matchDays = computed(() => store.state.tournamentSchedule.matchDays);

const matchesForSelectedDate = computed(() => {
  if (!selectedMatchDate.value) return [];

  return store.state.tournamentSchedule.schedule.map((field) => {
    const foundMatchDay = field.matchDays?.find(
      (matchDay) => matchDay.id === selectedMatchDate.value.id,
    );
    return foundMatchDay?.matches ?? [];
  });
});

const matchDrawer = ref(true);
const selectedMatchDate = ref(null);
const selectedField = ref(null);

const addFieldDialog = ref(false);
const isFormValid = ref(false);
const addFieldForm = ref(null);

const newFieldInit = {
  id: null,
  name: null,
  startTime: null,
  fieldOrder: null,
  tournamentId: route.params.tournamentId,
};
const newField = reactive({ ...newFieldInit });

const addField = () => {
  store
    .dispatch("tournamentSchedule/saveField", {
      newField: { ...newField, fieldOrder: schedule.value.length + 1 },
    })
    .finally(() => {
      addFieldDialog.value = false;
      Object.assign(newField, { ...newFieldInit });
    });
};

const addMatchToField = ({ match }) => {
  if (!schedule.value || !selectedField.value || !selectedMatchDate.value) {
    console.error(
      "Missing schedule, selected field, or match date information",
    );
    return;
  }
  const targetMatches =
    schedule.value
      .find((field) => field.id === selectedField.value.id)
      ?.matchDays?.find(
        (matchDay) => matchDay.id === selectedMatchDate.value.id,
      )?.matches || [];

  let startTimeString = "";
  let minsToAdd = 0;

  if (targetMatches.length) {
    startTimeString = targetMatches[targetMatches.length - 1].startTime;
    minsToAdd =
      tournament.value.matchDuration + tournament.value.matchIntervalTime;
  } else {
    startTimeString = `${selectedMatchDate.value.matchDate}T${selectedField.value.startTime}`;
  }
  const newMatchStartTime = new Date(startTimeString);
  newMatchStartTime.setMinutes(newMatchStartTime.getMinutes() + minsToAdd);

  const newMatch = {
    ...match,
    startTime: newMatchStartTime,
    matchDayId: selectedMatchDate.value.id,
    fieldId: selectedField.value.id,
  };

  store.dispatch("tournamentSchedule/updateMatch", { newMatch });
};

const deleteMatchFromField = ({ selectedFieldIndex, selectedMatchIndex }) => {
  const targetField = schedule.value[selectedFieldIndex];
  const foundMatchDayIndex = targetField.matchDays.findIndex(
    (item) => item.id === selectedMatchDate.value.id,
  );
  const targetMatches =
    schedule.value[selectedFieldIndex].matchDays[foundMatchDayIndex].matches;

  const selectedMatch = {
    ...targetMatches[selectedMatchIndex],
    startTime: null,
    matchDayId: null,
    fieldId: null,
  };
  const updatingMatches = [];
  const startTimeString = `${selectedMatchDate.value.matchDate}T${selectedField.value.startTime}`;

  for (let i = selectedMatchIndex + 1; i < targetMatches.length; i++) {
    const minsToAdd =
      (i - 1) *
      (tournament.value.matchDuration + tournament.value.matchIntervalTime);
    const calcStartTime = new Date(startTimeString);
    calcStartTime.setMinutes(calcStartTime.getMinutes() + minsToAdd);

    updatingMatches.push({
      id: targetMatches[i].id,
      startTime: calcStartTime,
    });

    schedule.value[selectedFieldIndex].matchDays[foundMatchDayIndex].matches[
      i
    ].startTime = calcStartTime;
  }

  store
    .dispatch("tournamentSchedule/deleteMatch", {
      selectedMatch,
      updatingMatches,
    })
    .then((res) => {
      //do changes in frontend
      const deletedMatches = schedule.value[selectedFieldIndex].matchDays[
        foundMatchDayIndex
      ].matches.splice(selectedMatchIndex, 1);

      store.commit("tournamentSchedule/addUnplannedMatches", {
        ...deletedMatches[0],
        startTime: null,
      });
    });
};
const editFieldDialog = ref(false);

const openEditField = ({ selectedFieldIndex }) => {
  const { id, name, startTime } = schedule.value[selectedFieldIndex];
  Object.assign(newField, { id, name, startTime });
  editFieldDialog.value = !editFieldDialog.value;
};
const editField = () => {
  store
    .dispatch("tournamentSchedule/saveField", {
      newField,
    })
    .then(() => {
      Object.assign(newField, { ...newFieldInit });
      editFieldDialog.value = !editFieldDialog.value;
    });
};
const deleteField = ({ selectedFieldIndex }) => {
  const selectedField = schedule.value[selectedFieldIndex];
  const matchIds = [];
  const matches = [];

  selectedField.matchDays?.forEach((matchDay) => {
    matchDay.matches?.forEach((match) => {
      matchIds.push(match.id);
      matches.push(match);
    });
  });

  store
    .dispatch("tournamentSchedule/deleteField", {
      selectedFieldId: selectedField.id,
      matchIds,
    })
    .then((res) => {
      schedule.value.splice(selectedFieldIndex, 1);
      store.commit("tournamentSchedule/addUnplannedMatches", matches);
      store.commit("tournamentSchedule/removeField", selectedField.id);

      selectedField.value = fields.value.length ? fields.value[0] : null;
    });
};

const fetchData = async () => {
  return Promise.all([
    store.dispatch("tournament/setTournamentWEmailOptionalById", {
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("tournamentSchedule/setSchedule", {
      tournamentId: route.params.tournamentId,
    }),
  ]);
};
onMounted(async () => {
  await fetchData();
  selectedMatchDate.value = matchDays.value[0];
  selectedField.value = fields.value[0];
});
</script>

<template>
  <v-container class="schedule">
    <v-row>
      <v-col>
        <page-title
          :sub-title="tournament.name"
          justify="space-between"
          show-back
          title="Schedule"
        >
        </page-title>
      </v-col>
    </v-row>

    <v-row align="center" class="mt-2 mt-md-4" justify="start" no-gutters>
      <v-col class="mr-0 mr-sm-4 mt-2" cols="auto">
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
      <v-col class="mt-2" cols="auto">
        <v-btn
          prepend-icon="mdi-timer-cancel-outline"
          @click="matchDrawer = !matchDrawer"
          >Unplanned Matches
        </v-btn>
      </v-col>
    </v-row>

    <v-row class="scrollable-container" justify="center">
      <v-col col="12">
        <v-row>
          <v-col
            v-for="(field, fieldIndex) in schedule"
            class="max-content"
            col="12"
            sm="4"
          >
            <v-card color="green" density="compact">
              <v-card-title class="d-flex justify-space-between">
                <span>{{ field.name }}</span>
                <div>
                  <v-btn
                    class=""
                    density="comfortable"
                    icon="mdi-pencil"
                    size="small"
                    variant="tonal"
                    @click="
                      openEditField({
                        selectedFieldIndex: fieldIndex,
                      })
                    "
                  ></v-btn>
                  <v-btn
                    class="ml-1"
                    density="comfortable"
                    icon="mdi-delete"
                    size="small"
                    variant="tonal"
                    @click="
                      deleteField({
                        selectedFieldIndex: fieldIndex,
                      })
                    "
                  ></v-btn>
                </div>
              </v-card-title>
              <v-card-subtitle class="pb-2">
                <span>{{ field.startTime }}</span>
                <v-chip
                  :class="`bg-green-accent-1 ml-2`"
                  density="comfortable"
                  label
                  size="small"
                  >field
                </v-chip>
              </v-card-subtitle>
              <v-list>
                <template
                  v-for="(match, matchIndex) in matchesForSelectedDate[
                    fieldIndex
                  ]"
                  v-if="matchesForSelectedDate[fieldIndex]?.length"
                >
                  <v-list-item>
                    <v-list-item-title>
                      {{ match.name }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="opacity-100">
                      <span class="text-disabled">{{
                        getTimeOnly(match.startTime)
                      }}</span>
                      <v-chip
                        :class="`ml-2`"
                        :color="calcMatchType(match.type).color"
                        density="comfortable"
                        label
                        size="small"
                        >{{ calcMatchType(match.type).title }}
                      </v-chip>
                    </v-list-item-subtitle>

                    <template #append>
                      <v-btn
                        class="ml-3"
                        icon="mdi-delete"
                        size="x-small"
                        variant="tonal"
                        @click="
                          deleteMatchFromField({
                            selectedFieldIndex: fieldIndex,
                            selectedMatchIndex: matchIndex,
                          })
                        "
                      ></v-btn>
                    </template>
                  </v-list-item>

                  <v-divider
                    v-if="
                      matchIndex !==
                      matchesForSelectedDate[fieldIndex].length - 1
                    "
                    class="mb-1 mt-2"
                  ></v-divider>
                </template>

                <no-items v-else cols="12" text="No items!"></no-items>
              </v-list>
            </v-card>
          </v-col>
          <v-col>
            <v-btn
              prepend-icon="mdi-plus"
              stacked
              @click="addFieldDialog = !addFieldDialog"
            >
              Field
            </v-btn>
          </v-col>

          <v-navigation-drawer v-model="matchDrawer" location="right" permanent>
            <div class="d-flex space-between">
              <v-btn
                icon="mdi-chevron-right"
                variant="text"
                @click="matchDrawer = !matchDrawer"
              ></v-btn>
              <v-list-item title="Add to Fields"></v-list-item>
            </div>

            <v-divider></v-divider>

            <v-list density="compact" nav>
              <v-list-item>
                <v-select
                  v-model="selectedField"
                  :items="fields"
                  clearable
                  color="primary"
                  density="compact"
                  hide-details="auto"
                  item-title="name"
                  item-value="id"
                  label="Select Field"
                  prepend-inner-icon="mdi-calendar"
                  return-object
                  rounded-sm
                  variant="solo-filled"
                ></v-select>
              </v-list-item>

              <template v-if="unplannedMatches.length">
                <template v-for="(match, matchIndex) in unplannedMatches">
                  <v-list-item>
                    <v-list-item-title>
                      {{ match.name }}
                    </v-list-item-title>
                    <div class="d-flex align-center">
                      <v-chip
                        :class="`mt-1`"
                        :color="`${calcMatchType(match.type).color}`"
                        density="comfortable"
                        label
                        size="small"
                        >{{ calcMatchType(match.type).title }}
                      </v-chip>
                    </div>

                    <template #append>
                      <v-btn
                        class="ml-2"
                        icon="mdi-plus"
                        size="x-small"
                        variant="tonal"
                        @click="addMatchToField({ match })"
                      ></v-btn>
                    </template>
                  </v-list-item>

                  <v-divider
                    v-if="matchIndex !== unplannedMatches.length - 1"
                  ></v-divider>
                </template>
              </template>
              <no-items
                v-else
                cols="12"
                text="No unplanned matches found!"
              ></no-items>
            </v-list>
          </v-navigation-drawer>
        </v-row>
      </v-col>
    </v-row>
  </v-container>

  <v-dialog v-model="addFieldDialog" width="320">
    <v-card title="Add Field">
      <v-card-text>
        <v-form
          ref="addFieldForm"
          v-model="isFormValid"
          fast-fail
          @submit.prevent="addField"
        >
          <v-text-field
            v-model="newField.name"
            :rules="[(v) => !!v || 'Name is required!']"
            class="mt-2"
            clearable
            color="primary"
            hide-details="auto"
            label="Name"
          ></v-text-field>
          <time-picker
            v-model="newField.startTime"
            :rules="[(v) => !!v || 'Start time is required!']"
            class="mt-2"
            clearable
            color="primary"
            hide-details="auto"
            label="Start time"
          ></time-picker>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              :density="xs ? 'comfortable' : 'default'"
              color="primary"
              type="submit"
              >Add
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog v-model="editFieldDialog" width="320">
    <v-card title="Edit Field">
      <v-card-text>
        <v-form
          ref="editFieldForm"
          v-model="isFormValid"
          fast-fail
          @submit.prevent="editField"
        >
          <v-text-field
            v-model="newField.name"
            :rules="[(v) => !!v || 'Name is required!']"
            class="mt-2"
            clearable
            color="primary"
            hide-details="auto"
            label="Name"
          ></v-text-field>
          <time-picker
            v-model="newField.startTime"
            :rules="[(v) => !!v || 'Start time is required!']"
            class="mt-2"
            clearable
            color="primary"
            hide-details="auto"
            label="Start time"
          ></time-picker>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              :density="xs ? 'comfortable' : 'default'"
              color="primary"
              type="submit"
              >Edit
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style>
.schedule .v-col {
  max-width: 100% !important;
}
</style>
