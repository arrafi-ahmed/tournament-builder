<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import PageTitle from "@/components/PageTitle.vue";

definePage({
  name: "dashboard-manager",
  meta: {
    requiresManager: true,
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
          sub-title="Manager"
          title="Dashboard"
        >
        </page-title>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col lg="3" sm="6">
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'match-updates',
            })
          "
        >
          <v-card-text class="text-center"><h2>Matches</h2></v-card-text>
        </v-card>
      </v-col>
      <v-col lg="3" sm="6">
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'team-squad',
            })
          "
        >
          <v-card-text class="text-center"><h2>Squad</h2></v-card-text>
        </v-card>
      </v-col>
      <v-col lg="3" sm="6">
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'tournament-join',
            })
          "
        >
          <v-card-text class="text-center"
            ><h2>Join Tournament</h2></v-card-text
          >
        </v-card>
      </v-col>
      <v-col lg="3" sm="6">
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'team-edit',
            })
          "
        >
          <v-card-text class="text-center"><h2>Team</h2></v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
