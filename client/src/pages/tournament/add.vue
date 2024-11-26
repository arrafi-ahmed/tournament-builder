<script setup>
import PageTitle from "@/components/PageTitle.vue";
import { computed, reactive, ref } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import {
  clientBaseUrl,
  getDateOnly,
  getSlug,
  isValidEmail,
} from "@/others/util";
import { useDisplay } from "vuetify";

definePage({
  name: "tournament-add",
  meta: {
    requiresAuth: true,
    title: "Add Tournament",
    layout: "default",
  },
});

const { xs } = useDisplay();
const router = useRouter();
const store = useStore();

const isSudo = computed(() => store.getters["user/isSudo"]);

const tournamentInit = {
  name: null,
  slug: "",
  type: null,
  location: null,
  startDate: null,
  endDate: null,
  rules: null,
  entityLastCount: { phase: 1, group: 1, bracket: 1, match: 1 },
  organizerEmail: null,
  organizerId: null,
};
const tournament = reactive({ ...tournamentInit });
const formatSlug = computed(() => getSlug(tournament.slug || ""));
const dynamicHint = computed(() =>
  formatSlug.value
    ? `Public URL: ${clientBaseUrl}/p/${formatSlug.value}`
    : "Example input: world-cup-24",
);
const types = [
  { title: "5-a-side", value: 5 },
  { title: "6-a-side", value: 6 },
  { title: "7-a-side", value: 7 },
  { title: "8-a-side", value: 8 },
  { title: "11-a-side", value: 11 },
];

const form = ref(null);
const isFormValid = ref(true);

const handleAddTournament = async () => {
  await form.value.validate();
  if (!isFormValid.value) return;

  await store
    .dispatch("tournament/save", {
      ...tournament,
      slug: formatSlug.value,
      startDate: getDateOnly(tournament.startDate),
      endDate: getDateOnly(tournament.endDate),
    })
    .then((result) => {
      // tournament = {...tournament, ...tournamentInit}
      Object.assign(tournament, {
        ...tournamentInit,
      });
      router.push({
        name: "tournament-list",
      });
    });
};
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          justify="space-between"
          show-back
          sub-title="Tournament"
          title="Add"
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
          @submit.prevent="handleAddTournament"
        >
          <v-text-field
            v-model="tournament.name"
            :rules="[(v) => !!v || 'Name is required!']"
            class="mt-2 mt-md-4"
            clearable
            hide-details="auto"
            label="Name"
            prepend-inner-icon="mdi-account"
          ></v-text-field>

          <v-text-field
            v-model="tournament.slug"
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
            v-model="tournament.type"
            :items="types"
            class="mt-2 mt-md-4"
            hide-details="auto"
            item-title="title"
            item-value="value"
            label="Type"
            prepend-inner-icon="mdi-account"
          ></v-select>

          <v-text-field
            v-model="tournament.location"
            :rules="[(v) => !!v || 'Location is required!']"
            class="mt-2 mt-md-4"
            clearable
            hide-details="auto"
            label="Location"
            prepend-inner-icon="mdi-map-marker"
          ></v-text-field>

          <v-date-input
            v-model="tournament.startDate"
            :rules="[(v) => !!v || 'Start Date is required!']"
            class="mt-2 mt-md-4"
            color="primary"
            label="Start Date"
            prepend-inner-icon="mdi-calendar"
            prepend-icon=""
            hide-details="auto"
          ></v-date-input>

          <v-date-input
            v-model="tournament.endDate"
            :rules="[
              (v) => !!v || 'End Date is required!',
              (v) =>
                tournament.startDate <= tournament.endDate ||
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
            v-model="tournament.rules"
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
            v-model="tournament.organizerEmail"
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

<style scoped></style>
