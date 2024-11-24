<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import PageTitle from "@/components/PageTitle.vue";
import ConfirmationDialog from "@/components/ConfirmationDialog.vue";
import NoItems from "@/components/NoItems.vue";
import { getTeamLogoUrl } from "@/others/util";

definePage({
  name: "team-list",
  meta: {
    requiresAuth: true,
    title: "Team List",
    layout: "default",
  },
});

const router = useRouter();
const store = useStore();

const teams = computed(() => store.state.team.teams);

const deleteTeam = (teamId) => {
  store.dispatch("team/removeTeam", { teamId });
};
const fetchData = () => {
  store.dispatch("team/setTeams");
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
          sub-title="Team"
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
                    name: 'team-add',
                  }"
                  density="compact"
                  prepend-icon="mdi-plus"
                  title="Add Team"
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
          v-if="teams.length > 0"
          density="compact"
          elevation="1"
          lines="two"
          rounded
        >
          <template v-for="(item, index) in teams">
            <v-list-item
              v-if="item"
              :key="index"
              :title="item?.name"
              link
              @click="
                router.push({
                  name: 'team-squad',
                  params: {
                    teamId: item.id,
                  },
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

                    <confirmation-dialog @confirm="deleteTeam(item.id)">
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
            <v-divider v-if="index !== teams.length - 1"></v-divider>
          </template>
        </v-list>
        <no-items v-else :cols="12"></no-items>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
