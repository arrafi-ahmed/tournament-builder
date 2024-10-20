<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import NoItems from "@/components/NoItems.vue";
import { formatDate, getDateOnly } from "@/others/util";
import DatePicker from "@/components/DatePicker.vue";
import { useDisplay } from "vuetify";

const router = useRouter();
const route = useRoute();
const store = useStore();
const { xs } = useDisplay();

const matchDays = computed(() => store.state.tournamentSettings.matchDays);
const tournament = computed(() => store.state.tournament.tournament);
const panels = ref("duration");

const matchDayInit = {
  matchDate: null,
  tournamentId: route.params.tournamentId,
};
const matchDay = reactive({ ...matchDayInit });

const addMatchDay = () => {
  store
    .dispatch("tournamentSettings/saveMatchDay", {
      matchDay: { ...matchDay, matchDate: getDateOnly(matchDay.matchDate) },
    })
    .finally(() => {
      Object.assign(matchDay, { ...matchDayInit });
      addMatchDayDialog.value = false;
    });
};
const deleteMatchDay = ({ matchDayId }) => {
  store.dispatch("tournamentSettings/deleteMatchDay", { matchDayId });
};
const matchDurationInit = {
  id: route.params.tournamentId,
  matchDuration: null,
  matchIntervalTime: null,
};
const matchDuration = reactive({ ...matchDurationInit });

const saveMatchDuration = () => {
  store.dispatch("tournament/save", { ...tournament.value, ...matchDuration });
};

const addMatchDayDialog = ref(false);
const isFormValid = ref(true);
const addMatchForm = ref(null);
const matchDurationForm = ref(null);

const fetchData = async () => {
  await Promise.all([
    store.dispatch("tournament/setTournamentWEmailOptionalById", {
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("tournamentSettings/setMatchDays", {
      tournamentId: route.params.tournamentId,
    }),
  ]);
};
onMounted(async () => {
  await fetchData();
  Object.assign(matchDuration, { ...tournament.value });
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          :sub-title="tournament.name"
          justify="space-between"
          show-back
          title="Settings"
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
      <v-col col="12" md="6">
        <v-expansion-panels v-model="panels" multiple>
          <v-expansion-panel value="duration">
            <v-expansion-panel-title>Match Duration</v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-form
                ref="matchDurationForm"
                v-model="isFormValid"
                fast-fail
                @submit.prevent="saveMatchDuration"
              >
                <v-text-field
                  v-model="matchDuration.matchDuration"
                  :rules="[(v) => !!v || 'Duration is required!']"
                  class="mt-2"
                  clearable
                  hide-details="auto"
                  label="Match Duration"
                  type="number"
                />
                <v-text-field
                  v-model="matchDuration.matchIntervalTime"
                  :rules="[(v) => !!v || 'Interval is required!']"
                  class="mt-2"
                  clearable
                  hide-details="auto"
                  label="Match Interval"
                  type="number"
                />
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn
                    :density="xs ? 'comfortable' : 'default'"
                    color="primary"
                    variant="tonal"
                    type="submit"
                    >Save
                  </v-btn>
                </v-card-actions>
              </v-form>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel value="match_days">
            <v-expansion-panel-title>
              <v-row justify="space-between" align="center">
                <v-col cols="auto">
                  <span>Match Days</span>
                </v-col>
                <v-col cols="auto">
                  <v-btn
                    class="mr-2"
                    color="primary"
                    density="comfortable"
                    variant="tonal"
                    @click.stop="addMatchDayDialog = !addMatchDayDialog"
                    >Add
                  </v-btn>
                </v-col>
              </v-row>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list
                v-if="matchDays.length > 0"
                density="compact"
                elevation="1"
                lines="two"
                rounded
              >
                <template v-for="(item, index) in matchDays">
                  <v-list-item
                    v-if="item"
                    :key="index"
                    :title="formatDate(item.matchDate)"
                    link
                  >
                    <template #subtitle>
                      <div class="text-truncate">
                        {{ item?.description }}
                      </div>
                    </template>

                    <template #append>
                      <v-btn
                        icon="mdi-delete"
                        rounded
                        size="small"
                        variant="tonal"
                        density="comfortable"
                        color="error"
                        @click="deleteMatchDay({ matchDayId: item.id })"
                      ></v-btn>
                    </template>
                  </v-list-item>
                  <v-divider v-if="index !== matchDays.length - 1"></v-divider>
                </template>
              </v-list>
              <no-items v-else :cols="12"></no-items>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
  </v-container>

  <v-dialog v-model="addMatchDayDialog" width="320">
    <v-card title="Add Match Date">
      <v-card-text>
        <v-form
          ref="addMatchForm"
          v-model="isFormValid"
          fast-fail
          @submit.prevent="addMatchDay"
        >
          <date-picker
            v-model="matchDay.matchDate"
            :rules="[(v) => !!v || 'Date is required!']"
            class="mt-2"
            clearable
            color="primary"
            hide-details="auto"
            label="Match Date"
          ></date-picker>

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
</template>

<style scoped></style>
