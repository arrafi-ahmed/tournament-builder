<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import PageTitle from "@/components/PageTitle.vue";

definePage({
  name: "dashboard-organizer",
  meta: {
    requiresOrganizer: true,
    title: "Dashboard",
    layout: "default",
  },
});

const router = useRouter();
const fetchData = () => {};
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
          sub-title="Organizer"
          title="Dashboard"
        >
          <!--          <v-row align="center">-->
          <!--            <v-menu>-->
          <!--              <template v-slot:activator="{ props }">-->
          <!--                <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text">-->
          <!--                </v-btn>-->
          <!--              </template>-->
          <!--              <v-list density="compact">-->
          <!--                <v-list-item-->
          <!--                  density="compact"-->
          <!--                  prepend-icon="mdi-lock"-->
          <!--                  title="Credentials"-->
          <!--                  @click="-->
          <!--                    router.push({-->
          <!--                      name: 'credential',-->
          <!--                    })-->
          <!--                  "-->
          <!--                ></v-list-item>-->
          <!--                <v-list-item-->
          <!--                  :to="{-->
          <!--                    name: 'team-add',-->
          <!--                  }"-->
          <!--                  density="compact"-->
          <!--                  prepend-icon="mdi-plus"-->
          <!--                  title="Add Team"-->
          <!--                ></v-list-item>-->
          <!--              </v-list>-->
          <!--            </v-menu>-->
          <!--          </v-row>-->
        </page-title>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col>
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'tournament-list',
            })
          "
        >
          <v-card-text class="text-center"><h2>Tournaments</h2></v-card-text>
        </v-card>
      </v-col>
      <v-col>
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'tournament-add',
            })
          "
        >
          <v-card-text class="text-center"
            ><h2>Create Tournament</h2></v-card-text
          >
        </v-card>
      </v-col>
      <v-col>
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'team-requests',
            })
          "
        >
          <v-card-text class="text-center"><h2>Team Requests</h2></v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
