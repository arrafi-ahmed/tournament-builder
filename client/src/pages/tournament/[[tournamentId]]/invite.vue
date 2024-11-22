<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import NoItems from "@/components/NoItems.vue";
import { getRequestBg, getTeamLogoUrl } from "@/others/util";

definePage({
  name: "tournament-invite",
  meta: {
    requiresAuth: true,
    title: "Invite Team",
    layout: "default",
  },
});

const router = useRouter();
const route = useRoute();
const store = useStore();

const teams = computed(() => store.state.team.teams);
const tournament = computed(() => store.state.tournament.tournament);
const searchKeyword = ref(null);
const currentUser = store.getters["user/getCurrentUser"];

const handleSearchTeam = () => {
  store.dispatch("team/searchTeam", { searchKeyword: searchKeyword.value });
};
const addParticipant = async (item) => {
  const canAddParticipant = await store.dispatch(
    "subscription/canAddParticipant",
    { userId: currentUser.id, tournamentId: route.params.tournamentId },
  );
  if (canAddParticipant) {
    store.dispatch("tournament/addParticipant", {
      teamId: item.tId,
      tournamentId: route.params.tournamentId,
      tournamentName: tournament.value.name,
      managerEmail: item.email,
    });
  } else {
    router.push({
      name: "pricing",
      params: { tournamentId: tournament.value.id },
    });
  }
};
const fetchData = async () => {
  Promise.all([
    store.dispatch("tournament/setTournamentWEmailOptionalById", {
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("tournament/setTournamentsByOrganizerId"),
  ]);
};
onMounted(async () => {
  fetchData();
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
          title="Invitation"
        >
          <v-row align="center">
            <v-menu :close-on-content-click="false">
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text">
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item
                  :to="{
                    name: 'team-add',
                  }"
                  density="compact"
                  prepend-icon="mdi-plus"
                  title="Create Team"
                ></v-list-item>
              </v-list>
            </v-menu>
          </v-row>
        </page-title>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col col="12" md="6">
        <v-text-field
          v-model="searchKeyword"
          append-inner-icon="mdi-magnify"
          item-title="name"
          item-value="id"
          label="Search by team name/manager email"
          variant="solo"
          @keyup.enter="handleSearchTeam"
          @click:append-inner="handleSearchTeam"
        ></v-text-field>

        <v-list
          v-if="teams.length > 0"
          density="compact"
          elevation="1"
          lines="three"
          rounded
        >
          <template v-for="(item, index) in teams">
            <v-list-item
              v-if="item"
              :key="index"
              :class="getRequestBg(item)"
              :title="item?.tName"
              link
            >
              <!--                    @click="-->
              <!--                      router.push({-->
              <!--                        name: 'team-single',-->
              <!--                        params: {-->
              <!--                          teamId: item.id,-->
              <!--                        },-->
              <!--                      })-->
              <!--                    "-->
              <template v-slot:prepend>
                <v-avatar
                  :image="getTeamLogoUrl(item.logo)"
                  :size="50"
                  rounded="sm"
                ></v-avatar>
              </template>
              <template v-slot:append>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn
                      class="ml-5"
                      icon="mdi-dots-vertical"
                      v-bind="props"
                      variant="text"
                    >
                    </v-btn>
                  </template>
                  <v-list density="compact">
                    <v-list-item
                      class="text-primary"
                      density="compact"
                      prepend-icon="mdi-plus"
                      title="Invite"
                      @click="addParticipant(item)"
                    ></v-list-item>
                  </v-list>
                </v-menu>
              </template>

              <template v-slot:subtitle>
                <div class="text-truncate">
                  {{ item?.tuName }}
                </div>
                <!--                <div>{{ item?.location }}</div>-->
              </template>
            </v-list-item>
            <v-divider v-if="index !== teams.length - 1"></v-divider>
          </template>
        </v-list>
        <no-items v-else :cols="12"></no-items>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
