<script setup>
import PageTitle from "@/components/PageTitle.vue";
import { computed, onMounted, reactive, ref } from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { isValidEmail } from "@/others/util";
import DatePicker from "@/components/DatePicker.vue";

const { mobile } = useDisplay();
const route = useRoute();
const router = useRouter();
const store = useStore();

const currentUser = computed(() => store.state.user.currentUser);
const tournament = computed(() => store.state.tournament.tournament);
const isSudo = computed(() => store.getters["user/isSudo"]);

const tournamentInit = {
  name: null,
  type: null,
  location: null,
  startDate: null,
  endDate: null,
  rules: null,
  entityLastCount: { phase: 1, group: 1, bracket: 1, match: 1 },
  organizerEmail: null,
  organizerId: null,
};
const newTournament = reactive({ ...tournamentInit });

const form = ref(null);
const isFormValid = ref(true);

const redirectDestination = computed(() =>
  currentUser.value.role === "sudo" || currentUser.value.role === "organizer"
    ? "tournament-list"
    : currentUser.value.role === "tournament_manager"
      ? "dashboard-manager"
      : null,
);

const types = [
  { title: "5-a-side", value: 5 },
  { title: "6-a-side", value: 6 },
  { title: "7-a-side", value: 7 },
  { title: "8-a-side", value: 8 },
  { title: "11-a-side", value: 11 },
];

const handleEditTournament = async () => {
  await form.value.validate();
  if (!isFormValid.value) return;

  await store.dispatch("tournament/save", newTournament).then((result) => {
    Object.assign(newTournament, {
      ...tournamentInit,
    });
    router.push({
      name: redirectDestination.value,
    });
  });
};
const fetchData = async () => {
  await store.dispatch("tournament/setTournamentWEmailOptionalById", {
    tournamentId: route.params.tournamentId,
  });
};
//order of checking is important cause group/group_knockout condition check result is same
onMounted(async () => {
  await fetchData();
  Object.assign(newTournament, {
    ...tournament.value,
    organizerEmail: tournament.value?.email,
  });
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
          sub-title="Tournament"
          title="Edit"
        >
        </page-title>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-form
          ref="form"
          v-model="isFormValid"
          fast-fail
          @submit.prevent="handleEditTournament"
        >
          <v-text-field
            v-model="newTournament.name"
            :rules="[(v) => !!v || 'Name is required!']"
            class="mt-2 mt-md-4"
            clearable
            hide-details="auto"
            label="Name"
            prepend-inner-icon="mdi-account"
            required
          ></v-text-field>

          <v-select
            v-model="newTournament.type"
            :items="types"
            class="mt-2 mt-md-4"
            hide-details="auto"
            item-title="title"
            item-value="value"
            label="Type"
            prepend-inner-icon="mdi-account"
          ></v-select>

          <v-text-field
            v-model="newTournament.location"
            :rules="[(v) => !!v || 'Location is required!']"
            class="mt-2 mt-md-4"
            clearable
            hide-details="auto"
            label="Location"
            prepend-inner-icon="mdi-map-marker"
          ></v-text-field>

          <date-picker
            v-model="newTournament.startDate"
            :rules="[(v) => !!v || 'Start Date is required!']"
            color="primary"
            custom-class="mt-2 mt-md-4"
            density="default"
            label="Start Date"
          ></date-picker>

          <date-picker
            v-model="newTournament.endDate"
            :rules="[
              (v) => !!v || 'End Date is required!',
              (v) =>
                newTournament.startDate <= newTournament.endDate ||
                'Start Date must be less than End Date',
            ]"
            color="primary"
            custom-class="mt-2 mt-md-4"
            density="default"
            label="End Date"
          ></date-picker>

          <v-textarea
            v-model="newTournament.rules"
            :rules="[(v) => !!v || 'Rules is required!']"
            class="mt-2 mt-md-4 text-pre-wrap"
            clearable
            density="compact"
            hide-details="auto"
            label="Rules"
            prepend-inner-icon="mdi-text-box"
            required
          ></v-textarea>

          <v-text-field
            v-if="isSudo"
            v-model="newTournament.organizerEmail"
            :rules="[
              (v) => !!v || 'Email is required!',
              (v) => isValidEmail(v) || 'Invalid Email',
            ]"
            class="mt-2 mt-md-4"
            clearable
            hide-details="auto"
            label="Organizer Email"
            prepend-inner-icon="mdi-email"
          ></v-text-field>

          <div class="d-flex align-center mt-3 mt-md-4">
            <v-spacer></v-spacer>
            <v-btn
              :density="mobile ? 'comfortable' : 'default'"
              color="primary"
              type="submit"
              >Save
            </v-btn>
          </div>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.v-avatar {
  border-radius: 0;
}

.v-avatar.v-avatar--density-default {
  width: calc(var(--v-avatar-height) + 80px);
}
</style>
