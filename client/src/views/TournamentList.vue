<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import RemoveEntity from "@/components/RemoveEntity.vue";
import NoItems from "@/components/NoItems.vue";
import { formatDate, toLocalISOString } from "@/others/util";
// import { getTournamentLogoUrl } from "@/others/util";

const router = useRouter();
const store = useStore();

const tournaments = computed(() => store.state.tournament.tournaments);

const deleteTournament = (tournamentId) => {
  store.dispatch("tournament/removeTournament", { tournamentId });
};
const fetchData = () => {
  store.dispatch("tournament/setTournaments");
};
onMounted(() => {
  fetchData();
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <page-title
          justify="space-between"
          show-back
          sub-title="Tournament"
          title="List"
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
                    name: 'tournament-add',
                  }"
                  density="compact"
                  prepend-icon="mdi-plus"
                  title="Add Tournament"
                ></v-list-item>
              </v-list>
            </v-menu>
          </v-row>
        </page-title>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col col="12" md="6">
        <v-list
          v-if="tournaments.length > 0"
          density="compact"
          elevation="1"
          lines="three"
          rounded
        >
          <template v-for="(item, index) in tournaments">
            <v-list-item
              v-if="item"
              :key="index"
              :title="item?.name"
              link
              @click="
                router.push({
                  name: 'tournament-dashboard',
                  params: { tournamentId: item.id },
                })
              "
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
                      prepend-icon="mdi-pencil"
                      title="Edit"
                      @click="
                        router.push({
                          name: 'tournament-edit',
                          params: { tournamentId: item.id },
                        })
                      "
                    ></v-list-item>

                    <v-divider></v-divider>

                    <remove-entity
                      custom-class="text-error"
                      label="Delete"
                      prepend-icon="mdi-delete"
                      variant="list"
                      @remove-entity="deleteTournament(item.id)"
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
        <no-items v-else :cols="12"></no-items>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
