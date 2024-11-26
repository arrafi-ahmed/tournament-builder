<script setup>
import PageTitle from "@/components/PageTitle.vue";
import { computed, onMounted, reactive, ref } from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import {
  clientBaseUrl,
  formatDate,
  getDateOnly,
  getSlug,
  isValidEmail,
} from "@/others/util";

definePage({
  name: "tournament-edit",
  meta: {
    requiresAuth: true,
    title: "Tournament Edit",
    layout: "default",
  },
});

const { xs } = useDisplay();
const route = useRoute();
const router = useRouter();
const store = useStore();

const currentUser = computed(() => store.state.user.currentUser);
const tournament = computed(() => store.state.tournament.tournament);
const isSudo = computed(() => store.getters["user/isSudo"]);

const tournamentInit = {
  name: null,
  slug: null,
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
const formatSlug = computed(() => getSlug(newTournament.slug || ""));
const dynamicHint = computed(() =>
  formatSlug.value
    ? `Public URL: ${clientBaseUrl}/p/${formatSlug.value}`
    : "Example input: world-cup-24",
);
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

  await store
    .dispatch("tournament/save", {
      ...newTournament,
      slug: formatSlug.value,
      startDate: getDateOnly(newTournament.startDate),
      endDate: getDateOnly(newTournament.endDate),
    })
    .then((result) => {
      Object.assign(newTournament, {
        ...tournamentInit,
      });
      router.push({
        name: redirectDestination.value,
      });
    });
};
const fetchData = async () => {
  return store.dispatch("tournament/setTournamentWEmailOptionalById", {
    tournamentId: route.params.tournamentId,
  });
};
//order of checking is important cause group/group_knockout condition check result is same
onMounted(async () => {
  await fetchData();
  Object.assign(newTournament, {
    ...tournament.value,
    startDate: new Date(tournament.value.startDate),
    endDate: new Date(tournament.value.endDate),
    organizerEmail: tournament.value?.email,
  });
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          :back-route="{ name: 'tournament-list' }"
          :sub-title="tournament.name"
          justify="space-between"
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

          <v-text-field
            v-model="newTournament.slug"
            :hint="dynamicHint"
            :rules="[
              (v) => !!v || 'Slug is required!',
              (v) =>
                /^[a-zA-Z0-9-]+$/.test(v) ||
                'Only letters, numbers, and hyphens are allowed!',
            ]"
            class="mt-2 mt-md-4"
            clearable
            hide-details="auto"
            label="Slug"
            persistent-hint
            prepend-inner-icon="mdi-link"
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

          <v-date-input
            v-model="newTournament.startDate"
            :display-value="formatDate(newTournament.startDate)"
            :rules="[(v) => !!v || 'Start Date is required!']"
            class="mt-2 mt-md-4"
            color="primary"
            label="Start Date"
            prepend-inner-icon="mdi-calendar"
            prepend-icon=""
            hide-details="auto"
          ></v-date-input>

          <v-date-input
            v-model="newTournament.endDate"
            :rules="[
              (v) => !!v || 'End Date is required!',
              (v) =>
                newTournament.startDate <= newTournament.endDate ||
                'Start Date must be less than End Date',
            ]"
            class="mt-2 mt-md-4"
            color="primary"
            label="End Date"
            prepend-inner-icon="mdi-calendar"
            prepend-icon=""
            hide-details="auto"
          ></v-date-input>

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
            v-model="newTournament.organizerEmail"
            :disabled="!isSudo"
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
              :density="xs ? 'comfortable' : 'default'"
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
