<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import NoItems from "@/components/NoItems.vue";
import { formatDate, getRequestBg, getTeamLogoUrl } from "@/others/util";

definePage({
  name: "team-requests",
  meta: {
    requiresAuth: true,
    title: "Team Requests",
    layout: "default",
  },
});

const router = useRouter();
const store = useStore();

const tournaments = computed(() => store.state.tournament.tournaments);
const teams = computed(() => store.state.team.teamRequests);

const deleteTeam = (teamId) => {
  store.dispatch("team/removeTeam", { teamId });
};
const fetchData = async () => {
  return Promise.all([
    store.dispatch("team/setTeamRequestsByOrganizerId"),
    store.dispatch("tournament/setTournamentsByOrganizerId"),
  ]);
};
onMounted(async () => {
  fetchData();
});
const selectedTournament = ref(null);

const approveTeamRequest = (teamRequest) => {
  teamRequest = {
    id: teamRequest.id,
    requestStatus: 1,
    tournamentId: teamRequest.tournamentId,
    teamId: teamRequest.teamId,
    updatedAt: teamRequest.updatedAt,
  };
  store.dispatch("team/updateTeamRequest", teamRequest);
};
const rejectTeamRequest = (teamRequest) => {
  teamRequest = {
    id: teamRequest.id,
    requestStatus: 0,
    tournamentId: teamRequest.tournamentId,
    teamId: teamRequest.teamId,
    updatedAt: teamRequest.updatedAt,
  };
  store.dispatch("team/updateTeamRequest", teamRequest);
};
watch(
  () => selectedTournament.value,
  (newVal) => {
    store.dispatch("team/setTeamRequestsByTournamentId", {
      tournamentId: newVal,
    });
  },
);
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          :back-route="{ name: 'dashboard' }"
          justify="space-between"
          sub-title="Tournament Join"
          title="Team Requests"
        >
        </page-title>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col :cols="12" md="6">
        <v-select
          v-model="selectedTournament"
          :items="tournaments"
          item-title="name"
          item-value="id"
          label="Filter by tournament"
          prepend-inner-icon="mdi-filter"
          variant="solo"
        ></v-select>

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
              :title="item?.tmName"
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
                      prepend-icon="mdi-check"
                      title="Approve"
                      @click="approveTeamRequest(item)"
                    ></v-list-item>

                    <v-divider></v-divider>

                    <confirmation-dialog @confirm="rejectTeamRequest(item)">
                      <template #activator="{ onClick }">
                        <v-list-item
                          class="text-error"
                          popup-title="Reject"
                          prepend-icon="mdi-delete"
                          title="Reject"
                          @click.stop="onClick"
                        ></v-list-item>
                      </template>
                    </confirmation-dialog>
                  </v-list>
                </v-menu>
              </template>

              <template v-slot:subtitle>
                <div class="text-truncate">
                  {{ item?.tuName }}
                </div>
                <div>Requested at: {{ formatDate(item.updatedAt) }}</div>
              </template>
            </v-list-item>
            <v-divider
              v-if="index !== teams.length - 1"
              class="my-2"
            ></v-divider>
          </template>
        </v-list>
        <no-items v-else :cols="12"></no-items>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
