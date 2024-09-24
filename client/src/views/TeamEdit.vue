<script setup>
import PageTitle from "@/components/PageTitle.vue";
import { computed, onMounted, reactive, ref } from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
import { getTeamLogoUrl, isValidImage } from "@/others/util";
import { useDisplay } from "vuetify";
import NoItems from "@/components/NoItems.vue";

const { mobile } = useDisplay();
const route = useRoute();
const router = useRouter();
const store = useStore();

const currentUser = computed(() => store.state.user.currentUser);
const targetTeamId = computed(() =>
  currentUser.value.role === "sudo" || currentUser.value.role === "organizer"
    ? route.params.teamId
    : currentUser.value.role === "team_manager"
    ? currentUser.value.teamId
    : null
);
const prefetchedTeam = computed(() =>
  store.getters["team/getTeamById"](targetTeamId.value)
);
const team = computed(() =>
  shouldFetchData.value ? store.state.team.team : prefetchedTeam.value
);

const teamInit = {
  id: null,
  name: null,
  ageGroup: null,
  email: null,
  logo: null,
  rmImage: null,
};
const newTeam = reactive({ ...teamInit });

const form = ref(null);
const isFormValid = ref(true);

const handleLogoUpdate = (file) => {
  newTeam.logo = file;
  if (team.value.logo) newTeam.rmImage = team.value.logo;
};
const handleLogoClear = () => {
  newTeam.logo = null;
  newTeam.rmImage = team.value.logo;
};
const handleNewLogoClear = () => {
  newTeam.logo = team.value.logo ? team.value.logo : null;
};

const redirectDestination = computed(() =>
  currentUser.value.role === "sudo" || currentUser.value.role === "organizer"
    ? "team-list"
    : currentUser.value.role === "team_manager"
    ? "dashboard-manager"
    : null
);

const ageGroups = [
  { title: "Under 18", value: "under_18" },
  { title: "Open", value: "open" },
  {
    title: "Adult",
    value: "adult",
  },
];

const handleEditTeam = async () => {
  await form.value.validate();
  if (!isFormValid.value) return;

  const formData = new FormData();
  formData.append("id", newTeam.id);
  formData.append("name", newTeam.name);
  formData.append("ageGroup", newTeam.ageGroup);
  formData.append("email", newTeam.email);

  if (newTeam.logo) formData.append("files", newTeam.logo);
  if (newTeam.rmImage) formData.append("rmImage", newTeam.rmImage);

  await store.dispatch("team/save", formData).then((result) => {
    // newTeam = {...newTeam, ...teamInit}
    Object.assign(newTeam, {
      ...teamInit,
    });
    router.push({
      name: redirectDestination.value,
    });
  });
};
const shouldFetchData = computed(
  () =>
    !prefetchedTeam.value?.id ||
    (targetTeamId.value == prefetchedTeam.value?.id &&
      !prefetchedTeam.value?.email)
);

const fetchData = async () => {
  if (shouldFetchData.value) {
    await store.dispatch("team/setTeamWEmail", { teamId: targetTeamId.value });
  }
};

onMounted(async () => {
  await fetchData();
  Object.assign(newTeam, {
    ...team.value,
  });
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          :sub-title="team?.name"
          justify="space-between"
          title="Edit Team"
          show-back
        >
        </page-title>
      </v-col>
    </v-row>

    <v-row v-if="team?.id">
      <v-col>
        <!--        {{newTeam}}-->
        <v-form
          ref="form"
          v-model="isFormValid"
          fast-fail
          @submit.prevent="handleEditTeam"
        >
          <v-text-field
            v-model="newTeam.name"
            :rules="[(v) => !!v || 'Name is required!']"
            class="mt-2 mt-md-4"
            clearable
            hide-details="auto"
            label="Name"
            prepend-inner-icon="mdi-account"
            required
          ></v-text-field>

          <v-select
            v-model="newTeam.ageGroup"
            :items="ageGroups"
            class="mt-2 mt-md-4"
            hide-details="auto"
            item-title="title"
            item-value="value"
            label="Age Group"
            prepend-inner-icon="mdi-account"
          ></v-select>

          <v-text-field
            v-model="newTeam.email"
            :rules="[(v) => !!v || 'Email is required!']"
            class="mt-2 mt-md-4"
            clearable
            hide-details="auto"
            label="Manager Email"
            prepend-inner-icon="mdi-email"
            required
          ></v-text-field>

          <v-row align="center" justify="start" no-gutters>
            <v-col class="mt-5" cols="12" sm="3">
              <v-img
                :src="getTeamLogoUrl(newTeam.logo)"
                aspect-ratio="1"
                class="position-relative mx-1 border"
                cover
                rounded
              >
                <v-btn
                  v-if="newTeam.logo"
                  class="position-absolute rounded-0"
                  color="error"
                  density="comfortable"
                  icon="mdi-delete"
                  location="top end"
                  size="small"
                  @click="handleLogoClear"
                >
                </v-btn>
              </v-img>

              <v-file-input
                :rules="[
                  (v) =>
                    (Array.isArray(v) ? v : [v]).every((file) =>
                      isValidImage(file)
                    ) || 'Only jpg/jpeg/png allowed!',
                ]"
                accept="image/*"
                class="mx-1"
                hide-details="auto"
                label="Update Logo"
                prepend-icon=""
                prepend-inner-icon="mdi-camera"
                show-size
                variant="solo-filled"
                @update:modelValue="handleLogoUpdate"
                @click:clear="handleNewLogoClear"
              >
                <template v-slot:selection="{ fileNames }">
                  <template v-for="fileName in fileNames" :key="fileName">
                    <v-chip class="me-2" color="primary" label size="small">
                      {{ fileName }}
                    </v-chip>
                  </template>
                </template>
              </v-file-input>
            </v-col>
          </v-row>

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
    <no-items v-else></no-items>
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
