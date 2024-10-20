<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import RemoveEntity from "@/components/RemoveEntity.vue";
import NoItems from "@/components/NoItems.vue";
import { formatDate, getRequestBg, toLocalISOString } from "../others/util";
// import { getTournamentLogoUrl } from "@/others/util";

const router = useRouter();
const store = useStore();

const tournaments = computed(() => store.state.tournament.tournaments);
const joinRequests = computed(() => store.state.tournament.joinRequests);

const deleteTournament = (tournamentId) => {
  store.dispatch("tournament/removeTournament", { tournamentId });
};
const searchKeyword = ref(null);

const showJoinRequests = () => {
  store.dispatch("tournament/setJoinRequestsByTeamId").then((result) => {
    store.commit("tournament/setTournaments", joinRequests.value);
    shouldShowJoinRequests.value = true;
  });
};

const handleSearchTournament = () => {
  shouldShowJoinRequests.value = false;
  store.dispatch("tournament/searchTournament", {
    searchKeyword: searchKeyword.value,
  });
};

const handleJoinTournament = (tournamentId) => {
  store
    .dispatch("tournament/joinTournament", {
      tournamentId,
    })
    .then(() => {
      // shouldShowJoinRequests.value = true;
    });
};

const handleCancelJoinTournament = (requestId, tournamentId) => {
  store.dispatch("tournament/cancelJoinTournament", {
    requestId,
    tournamentId,
  });
};

const fetchData = () => {
  store.dispatch("tournament/setJoinRequestsByTeamId");
};

const shouldShowJoinRequests = ref(false);
const generateTitle = computed(() =>
  shouldShowJoinRequests.value ? "Sent Requests" : "Search",
);

onMounted(() => {
  fetchData();
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          :title="generateTitle"
          justify="space-between"
          show-back
          sub-title="Tournament Join"
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
                  prepend-icon="mdi-eye"
                  title="Show Join Requests"
                  @click="showJoinRequests"
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
          hide-details
          label="Search by name"
          variant="solo"
          @keydown.enter="handleSearchTournament"
          @click:append-inner="handleSearchTournament"
        ></v-text-field>

        <v-list
          v-if="tournaments.length > 0"
          class="mt-2 mt-md-4"
          density="default"
          elevation="1"
          lines="three"
          rounded
        >
          <template v-for="(item, index) in tournaments">
            <v-list-item
              v-if="item"
              :key="index"
              :class="getRequestBg(item)"
              :title="item?.name"
              link
            >
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
                      v-if="!item.sentRequest"
                      class="text-primary"
                      prepend-icon="mdi-plus"
                      title="Join"
                      @click="handleJoinTournament(item.tournamentId)"
                    ></v-list-item>

                    <remove-entity
                      v-else
                      custom-class="text-error"
                      label="Cancel"
                      prepend-icon="mdi-close"
                      variant="list"
                      @remove-entity="
                        handleCancelJoinTournament(item.id, item.tournamentId)
                      "
                    ></remove-entity>
                  </v-list>
                </v-menu>
              </template>

              <template v-slot:subtitle>
                <div class="pt-2">
                  <v-icon>mdi-calendar</v-icon>
                  {{ formatDate(toLocalISOString(item?.startDate)) }} -
                  {{ formatDate(toLocalISOString(item?.endDate)) }}
                </div>
                <div class="pt-2">
                  <v-icon>mdi-map-marker</v-icon>
                  {{ item?.location }}
                </div>
              </template>
            </v-list-item>
            <v-divider v-if="index !== tournaments.length - 1"></v-divider>
          </template>
        </v-list>
        <no-items v-else :cols="12" class="mt-2 mt-md-4"></no-items>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
