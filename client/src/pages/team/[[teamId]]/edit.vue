<script setup>
import PageTitle from "@/components/PageTitle.vue";
import { computed, onMounted, reactive, ref, watchEffect } from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
import {getTeamLogoUrl, isValidEmail, isValidImage} from "@/others/util";
import { useDisplay } from "vuetify";
import NoItems from "@/components/NoItems.vue";

definePage({
  name: "team-edit",
  meta: {
    requiresAuth: true,
    title: "Edit Team",
    layout: "default",
  },
});

const { xs } = useDisplay();
const route = useRoute();
const router = useRouter();
const store = useStore();
const isSudo = computed(() => store.getters["user/isSudo"]);
const isOrganizer = computed(() => store.getters["user/isOrganizer"]);
const isTeamManager = computed(() => store.getters["user/isTeamManager"]);

const currentUser = computed(() => store.state.user.currentUser);
const targetTeamId = computed(() => {
  if (isSudo.value || isOrganizer.value) {
    return route.params.teamId ?? null;
  } else if (isTeamManager.value) {
    return currentUser.value.teamId ?? null;
  } else {
    return null;
  }
});

const team = computed(() => store.state.team.team);

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
  isSudo.value || isOrganizer.value
    ? "team-list"
    : isTeamManager.value
      ? "dashboard-manager"
      : null,
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
    //fix:if clicking back in team-list page, skip going team-add/edit page
    router.replace({
      name: redirectDestination.value,
    });
    if (window.history.length > 2) {
      router.go(-1);
    }
  });
};
//if role manager and teamId not available, redirect to team-add
watchEffect(() => {
  console.log(46, targetTeamId.value);
  if (!targetTeamId.value) {
    router.replace({ name: "team-add" });
  }
});

const fetchData = async () => {
  return store.dispatch("team/setTeamWEmail", { teamId: targetTeamId.value });
};

onMounted(async () => {
  await fetchData();
  console.log(45, targetTeamId.value);
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
          show-back
          title="Edit Team"
        >
        </page-title>
      </v-col>
    </v-row>

    <v-row v-if="team?.id">
      <v-col>
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
            :rules="[
              (v) => !!v || 'Email is required!',
              (v) => isValidEmail(v) || 'Invalid Email',
            ]"
            :disabled="isTeamManager"
            class="mt-2 mt-md-4"
            clearable
            hide-details="auto"
            label="Manager Email"
            prepend-inner-icon="mdi-email"
            required
          ></v-text-field>

          <v-row align="center" justify="start" no-gutters>
            <v-col class="mt-5" :cols="12" sm="2">
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
                      isValidImage(file),
                    ) || 'Only jpg/jpeg/png allowed!',
                ]"
                accept="image/*"
                class="mx-1"
                hide-details="auto"
                label="Logo"
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
              :density="xs ? 'comfortable' : 'default'"
              color="primary"
              type="submit"
              >Save
            </v-btn>
          </div>
        </v-form>
      </v-col>
    </v-row>
    <no-items v-else :md="6"></no-items>
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
