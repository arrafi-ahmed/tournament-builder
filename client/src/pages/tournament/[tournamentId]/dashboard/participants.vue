<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import NoItems from "@/components/NoItems.vue";
import { getTeamLogoUrl, isValidEmail } from "@/others/util";

definePage({
  name: "tournament-participants",
  meta: {
    requiresAuth: true,
    title: "Participants",
    layout: "tournament-dashboard",
  },
});

const router = useRouter();
const route = useRoute();
const store = useStore();

const participants = computed(() => store.state.tournament.participants);
const tournament = computed(() => store.state.tournament.tournament);
const isPremiumUser = computed(() => store.state.subscription.isPremiumUser);
const currentUser = store.getters["user/getCurrentUser"];

const deleteParticipant = (id, teamId, tournamentId) => {
  store.dispatch("tournament/removeParticipant", {
    id,
    teamId,
    tournamentId,
  }); //TODO
};
const showWarningDialog = ref(false);

const goInvitePage = async () => {
  await store.dispatch("subscription/canAddParticipant", {
    userId: currentUser.id,
    tournamentId: route.params.tournamentId,
  });
  if (isPremiumUser.value) {
    router.push({
      name: "tournament-invite",
      params: { tournamentId: tournament.value.id },
    });
  } else {
    showWarningDialog.value = true;
  }
};
const goInvitePageAfterConfirmation = (async) => {
  if (isPremiumUser.value) {
    router.push({
      name: "tournament-invite",
      params: { tournamentId: tournament.value.id },
    });
  } else {
    router.push({
      name: "pricing",
      params: { tournamentId: tournament.value.id },
    });
  }
};
const fetchData = async () => {
  return Promise.all([
    store.dispatch("tournament/setTournamentWEmailOptionalById", {
      tournamentId: route.params.tournamentId,
    }),
    store.dispatch("tournament/setParticipantsWTournament", {
      tournamentId: route.params.tournamentId,
    }),
  ]);
};
onMounted(async () => {
  fetchData();
});
</script>

<template>
  <v-dialog v-model="showWarningDialog" width="350">
    <v-card>
      <v-card-title>
        <span>Activate Subscription</span>
      </v-card-title>
      <v-card-text>
        <p>To add more than 6 participants, you need to buy subscription!</p>
      </v-card-text>
      <v-card-actions>
        <v-btn
          density="comfortable"
          color="primary"
          @click="goInvitePageAfterConfirmation"
          >Activate
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-container>
    <v-row>
      <v-col>
        <page-title
          :back-route="{ name: 'tournament-list' }"
          :sub-title="tournament.name"
          justify="space-between"
          title="Participants"
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
                  prepend-icon="mdi-account-plus"
                  title="Invite Team"
                  @click="goInvitePage"
                ></v-list-item>
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
      <v-col :cols="12" md="6">
        <v-list
          v-if="participants.length > 0"
          density="compact"
          elevation="1"
          lines="two"
          rounded
        >
          <template v-for="(item, index) in participants">
            <v-list-item
              v-if="item"
              :key="index"
              :title="item?.name"
              link
              @click="
                router.push({
                  name: 'team-squad',
                  params: { teamId: item.id },
                })
              "
            >
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
                      density="compact"
                      prepend-icon="mdi-eye"
                      title="Squad"
                      @click="
                        router.push({
                          name: 'team-squad',
                          params: {
                            teamId: item.id,
                          },
                        })
                      "
                    ></v-list-item>

                    <v-list-item
                      prepend-icon="mdi-pencil"
                      title="Edit"
                      @click="
                        router.push({
                          name: 'team-edit',
                          params: { teamId: item.id },
                        })
                      "
                    ></v-list-item>

                    <v-divider></v-divider>

                    <confirmation-dialog
                      @confirm="
                        deleteParticipant(item.ttId, item.tmId, item.tuId)
                      "
                    >
                      <template #activator="{ onClick }">
                        <v-list-item
                          class="text-error"
                          prepend-icon="mdi-delete"
                          title="Delete"
                          @click.stop="onClick"
                        ></v-list-item>
                      </template>
                    </confirmation-dialog>
                  </v-list>
                </v-menu>
              </template>

              <template v-slot:subtitle>
                <div class="text-truncate">
                  {{ item?.description }}
                </div>
              </template>
            </v-list-item>
            <v-divider v-if="index !== participants.length - 1"></v-divider>
          </template>
        </v-list>
        <no-items v-else :cols="12"></no-items>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
