<script setup>
import PageTitle from "@/components/PageTitle.vue";
import { computed, onMounted, reactive, ref } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
import { isValidEmail, isValidImage } from "@/others/util";
import { useDisplay } from "vuetify";

definePage({
  name: "team-add",
  meta: {
    requiresAuth: true,
    title: "Add Team",
    layout: "default",
  },
});

const { xs } = useDisplay();
const router = useRouter();
const store = useStore();
const isTeamManager = computed(() => store.getters["user/isTeamManager"]);
const currentUser = computed(() => store.getters["user/getCurrentUser"]);

const teamInit = {
  name: null,
  ageGroup: null,
  email: null,
  logo: null,
};
const team = reactive({ ...teamInit });
const ageGroups = [
  { title: "Under 18", value: "under_18" },
  { title: "Open", value: "open" },
  {
    title: "Adult",
    value: "adult",
  },
];

const form = ref(null);
const isFormValid = ref(true);

const handleTeamLogo = (file) => {
  team.logo = file;
};

const handleAddTeam = async () => {
  await form.value.validate();
  if (!isFormValid.value) return;

  const formData = new FormData();
  formData.append("name", team.name);
  formData.append("ageGroup", team.ageGroup);
  formData.append("email", team.email);

  if (team.logo) formData.append("files", team.logo);

  await store.dispatch("team/save", formData).then((result) => {
    // if teamManager saves team data, setCurrentUser in store
    if (isTeamManager.value) {
      console.log(10, result)
      store.commit("user/setCurrentUser", {
        ...currentUser.value,
        teamId: result.id,
        teamName: result.name,
      });
    }
    Object.assign(team, {
      ...teamInit,
    });
    //fix:if clicking back in team-list page, skip going team-add/edit page
    router.replace({
      name: "team-list",
    });
    if (window.history.length > 2) {
      router.go(-1);
    }
  });
};
onMounted(() => {
  if (isTeamManager.value) {
    team.email = currentUser.value.email;
  }
  console.log(66, currentUser.value, team.email);
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          justify="space-between"
          show-back
          sub-title="Team"
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
          @submit.prevent="handleAddTeam"
        >
          <v-text-field
            v-model="team.name"
            :rules="[(v) => !!v || 'Name is required!']"
            class="mt-2 mt-md-4"
            clearable
            hide-details="auto"
            label="Name"
            prepend-inner-icon="mdi-account"
          ></v-text-field>

          <v-text-field
            v-model="team.email"
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
          ></v-text-field>

          <v-select
            v-model="team.ageGroup"
            :items="ageGroups"
            class="mt-2 mt-md-4"
            hide-details="auto"
            item-title="title"
            item-value="value"
            label="Age Group"
            prepend-inner-icon="mdi-account"
          ></v-select>

          <v-file-input
            :rules="[
              (v) =>
                (Array.isArray(v) ? v : [v]).every((file) =>
                  isValidImage(file),
                ) || 'Only jpg/jpeg/png allowed!',
            ]"
            accept="image/*"
            class="mt-2 mt-md-4"
            hide-details="auto"
            label="Logo"
            prepend-icon=""
            prepend-inner-icon="mdi-camera"
            show-size
            @update:modelValue="handleTeamLogo"
          >
            <template v-slot:selection="{ fileNames }">
              <template v-for="fileName in fileNames" :key="fileName">
                <v-chip class="me-2" color="primary" label size="small">
                  {{ fileName }}
                </v-chip>
              </template>
            </template>
          </v-file-input>

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
