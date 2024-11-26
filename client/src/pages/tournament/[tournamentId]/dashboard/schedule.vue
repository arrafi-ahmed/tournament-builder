<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import NoItems from "@/components/NoItems.vue";
import {
  addSwipeBlocking,
  calcMatchType,
  getTeamName,
  getTimeOnly,
  removeSwipeBlocking,
} from "@/others/util";
import { useDisplay } from "vuetify";
import TimePicker from "@/components/TimePicker.vue";
import { toast } from "vue-sonner";
import { VueDraggableNext } from "vue-draggable-next";

definePage({
  name: "tournament-schedule",
  meta: {
    requiresAuth: true,
    title: "Schedule",
    layout: "tournament-dashboard",
  },
});

const router = useRouter();
const route = useRoute();
const store = useStore();
const { xs, md } = useDisplay();

const tournament = computed(() => store.state.tournament.tournament);
const schedule = computed(() => store.state.tournamentSchedule.schedule);
const unplannedMatches = computed(
  () => store.state.tournamentSchedule.unplannedMatches,
);
const fields = computed(() => store.state.tournamentSchedule.fields);
const matchDays = computed(() => store.state.tournamentSchedule.matchDays);
const titles = computed(() => store.state.tournamentSchedule.titles);

const matchesForSelectedDate = computed(() => {
  if (!selectedMatchDate.value) return [];

  return store.state.tournamentSchedule.schedule.map((field) => {
    const foundMatchDay = field.matchDays?.find(
      (matchDay) => matchDay.id === selectedMatchDate.value.id,
    );
    return foundMatchDay?.matches ?? [];
  });
});
const matchDrawer = ref(md.value);
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

const getMatchStartTime = ({ matches }) => {
  let lastMatchStartTimeString = "";
  let minsToAdd = 0;

  if (matches.length) {
    lastMatchStartTimeString = matches[matches.length - 1].startTime;
    minsToAdd =
      tournament.value.matchDuration + tournament.value.matchIntervalTime;
  } else {
    lastMatchStartTimeString = `${selectedMatchDate.value.matchDate}T${selectedField.value.startTime}`;
  }
  const lastMatchStartTime = new Date(lastMatchStartTimeString);
  const newMatchStartTime = lastMatchStartTime.setMinutes(
    lastMatchStartTime.getMinutes() + minsToAdd,
  );
  return newMatchStartTime;
};

const addMatchToField = ({ match }) => {
  if (!schedule.value || !selectedField.value || !selectedMatchDate.value) {
    toast.error("Missing schedule, selected field, or match date information");
    return;
  }
  const targetMatches =
    schedule.value
      .find((field) => field.id === selectedField.value.id)
      ?.matchDays?.find(
        (matchDay) => matchDay.id === selectedMatchDate.value.id,
      )?.matches || [];

  const newMatchStartTime = getMatchStartTime({ matches: targetMatches });

  // const { hostName, ...rest } = match;
  const newMatch = {
    ...match,
    startTime: new Date(newMatchStartTime),
    matchDayId: selectedMatchDate.value.id,
    fieldId: selectedField.value.id,
  };
  // const recipients = [];
  // if (match.homeTeamId) recipients.push(match.homeTeamId);
  // if (match.awayTeamId) recipients.push(match.awayTeamId);
  //
  // if (recipients.length) {
  //   const emailContent = {
  //     recipients,
  //     fieldName: selectedField.value.name,
  //     tournamentName: tournament.value.name,
  //     ...newMatch,
  //   };
  //   store.dispatch("tournamentSchedule/newScheduleEmail", {
  //     emailContent,
  //   });
  // }
  store.dispatch("tournamentSchedule/updateMatch", {
    newMatch,
    hostName: match.hostName,
  });
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
  //remove hostname for backend, but keep it in frontend
  // const preservedHostName = selectedMatch.hostName;
  // delete selectedMatch.hostName;

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
        // hostName: preservedHostName,
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
    store.dispatch("tournament/setParticipants", {
      tournamentId: route.params.tournamentId,
    }),
  ]);
};

const handleFieldMatchChanged = (fieldIndex, eventData) => {
  const {
    moved: { element, oldIndex, newIndex },
  } = eventData;
  if (!element) return;

  const schedule = store.state.tournamentSchedule.schedule;
  const field = schedule[fieldIndex];

  if (field && field.matchDays) {
    const matchDayIndex = field.matchDays.findIndex(
      (matchDay) => matchDay.id === selectedMatchDate.value.id,
    );
    if (matchDayIndex !== -1) {
      const matches = field.matchDays[matchDayIndex].matches;
      const startTimeString = `${selectedMatchDate.value.matchDate}T${field.startTime}`;

      const formattedMatches = matches.map((item, index) => {
        let startTime = new Date(startTimeString);
        const minsToAdd =
          (tournament.value.matchDuration +
            tournament.value.matchIntervalTime) *
          index;
        startTime =
          index === 0
            ? startTime
            : startTime.setMinutes(startTime.getMinutes() + minsToAdd);
        return {
          ...item,
          startTime,
        };
      });
      store.dispatch("tournamentSchedule/updateMatches", {
        fieldIndex,
        matchDayIndex,
        matches: formattedMatches,
        // emailContent: {
        //   // used to send email to teamIds about updated schedule
        //   fields: fields.value.map(({ id, name }) => ({ id, name })),
        //   updatedMatchesIndex: [oldIndex, newIndex].sort((a, b) => a - b),
        // },
      });
    }
  }
};
const broadcastUpdateForm = ref(null);
const participants = computed(() => store.state.tournament.participants);

const selectedParticipants = ref([]);
const isAllParticipantsSelected = ref(false);

const selectedBroadcastType = ref([]);
const broadcastTypes = ref([
  { id: "schedule_created", name: "Schedule Created" },
  { id: "schedule_updated", name: "Schedule Updated" },
  { id: "schedule_deleted", name: "Schedule Deleted" },
  { id: "result_published", name: "Result Published" },
]);

const showBroadcastUpdateDialog = ref(false);
const openBroadcastUpdateDialog = () => {
  showBroadcastUpdateDialog.value = !showBroadcastUpdateDialog.value;
};
const broadcastUpdate = () => {
  if (selectedParticipants.value.length) {
    store
      .dispatch("tournamentSchedule/broadcastUpdate", {
        receiverIds: selectedParticipants.value,
        broadcastType: selectedBroadcastType.value,
        tournament: { id: tournament.value.id, name: tournament.value.name },
      })
      .finally(
        () =>
          (showBroadcastUpdateDialog.value = !showBroadcastUpdateDialog.value),
      );
  }
};

watch(
  () => isAllParticipantsSelected.value,
  (newVal) => {
    if (newVal) {
      selectedParticipants.value = participants.value.map((item) => item.id);
    } else {
      selectedParticipants.value = [];
    }
  },
);

onMounted(async () => {
  await fetchData();
  selectedMatchDate.value = matchDays.value[0];
  selectedField.value = fields.value[0];
  addSwipeBlocking();
});
onUnmounted(() => {
  removeSwipeBlocking();
});
</script>

<template>
  <v-container class="schedule">
    <v-row>
      <v-col>
        <page-title
          :back-route="{ name: 'tournament-list' }"
          :sub-title="tournament.name"
          justify="space-between"
          title="Schedule"
        >
          <v-row align="center">
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text">
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item
                  density="compact"
                  prepend-icon="mdi-share"
                  title="Broadcast Update"
                  @click="openBroadcastUpdateDialog"
                ></v-list-item>
              </v-list>
            </v-menu>
          </v-row>
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

    <v-row class="scrollable-container no-block-swipe" justify="center">
      <v-col :cols="12">
        <v-row>
          <v-col
            v-for="(field, fieldIndex) in schedule"
            :cols="12"
            class="max-content"
            sm="4"
          >
            <v-card color="green" density="compact" flat>
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
              <v-card-text v-if="matchesForSelectedDate[fieldIndex]?.length">
                <vue-draggable-next
                  :list="matchesForSelectedDate[fieldIndex]"
                  @change="handleFieldMatchChanged(fieldIndex, $event)"
                >
                  <v-card
                    v-for="(match, matchIndex) in matchesForSelectedDate[
                      fieldIndex
                    ]"
                    :key="match?.id"
                    class="cursor-move subtitle-full-opacity mb-2"
                  >
                    <template #title>
                      {{ match.name }}
                    </template>
                    <template #subtitle>
                      <span class="text-disabled">{{
                        getTimeOnly(match.startTime)
                      }}</span>
                      <v-chip
                        :class="`ml-2`"
                        :color="calcMatchType(match.type).color"
                        density="comfortable"
                        label
                        size="small"
                        >{{ match.hostName }}
                      </v-chip>
                    </template>

                    <template #text>
                      <div class="font-weight-medium me-2">
                        {{
                          match.homeTeamName ||
                          getTeamName(match, "home", titles)
                        }}
                      </div>
                      <v-chip class="my-2" color="error" size="small"
                        >V
                      </v-chip>
                      <div class="font-weight-medium me-2">
                        {{
                          match.awayTeamName ||
                          getTeamName(match, "away", titles)
                        }}
                      </div>
                    </template>

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
                  </v-card>
                </vue-draggable-next>
              </v-card-text>
              <no-items v-else :cols="12" text="No items!"></no-items>
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
                  <v-card class="subtitle-full-opacity" density="compact">
                    <template #title>
                      {{ match.name }}
                    </template>
                    <template #subtitle>
                      <v-chip
                        :class="`mt-1`"
                        :color="`${calcMatchType(match.type).color}`"
                        density="comfortable"
                        label
                        size="small"
                        >{{ match.hostName }}
                      </v-chip>
                    </template>
                    <template #text>
                      <div class="font-weight-medium me-2">
                        {{
                          match.homeTeamName ||
                          getTeamName(match, "home", titles)
                        }}
                      </div>
                      <v-chip class="my-2" color="error" size="small"
                        >V
                      </v-chip>
                      <div class="font-weight-medium me-2">
                        {{
                          match.awayTeamName ||
                          getTeamName(match, "away", titles)
                        }}
                      </div>
                    </template>

                    <template #append>
                      <v-btn
                        class="ml-2"
                        icon="mdi-plus"
                        size="x-small"
                        variant="tonal"
                        @click="addMatchToField({ match })"
                      ></v-btn>
                    </template>
                  </v-card>

                  <v-divider
                    v-if="matchIndex !== unplannedMatches.length - 1"
                  ></v-divider>
                </template>
              </template>
              <no-items
                v-else
                :closable="false"
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

  <v-dialog v-model="showBroadcastUpdateDialog" :width="xs ? 400 : 600">
    <v-card>
      <v-card-title>
        <div class="d-flex justify-space-between">
          <span>Broadcast Tournament Update</span>
        </div>
      </v-card-title>
      <v-card-text>
        <v-form
          ref="broadcastUpdateForm"
          v-model="isFormValid"
          fast-fail
          @submit.prevent="broadcastUpdate"
        >
          <v-checkbox
            v-model="isAllParticipantsSelected"
            hide-details="auto"
            label="Select All Participants"
          ></v-checkbox>
          <v-select
            v-model="selectedParticipants"
            :items="participants"
            hide-details="auto"
            item-title="name"
            item-value="id"
            label="Select Teams"
            multiple
          >
            <template v-slot:selection="data">
              <v-chip
                :key="JSON.stringify(data.item)"
                :disabled="data.disabled"
                :model-value="data.selected"
                v-bind="data.attrs"
                @click:close="data.parent.selectItem(data.item)"
              >
                <template v-slot:prepend>
                  <v-avatar class="bg-accent text-uppercase" start
                    >{{ data.item.title.slice(0, 1) }}
                  </v-avatar>
                </template>
                {{ data.item.title }}
              </v-chip>
            </template>
          </v-select>
          <v-select
            v-model="selectedBroadcastType"
            :items="broadcastTypes"
            class="mt-2 mt-md-4"
            hide-details="auto"
            item-title="name"
            item-value="id"
            label="Select Broadcast Type"
          ></v-select>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              :density="xs ? 'comfortable' : 'default'"
              color="primary"
              type="submit"
              >Broadcast
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

.subtitle-full-opacity .v-card-subtitle {
  opacity: 1 !important;
}
</style>
