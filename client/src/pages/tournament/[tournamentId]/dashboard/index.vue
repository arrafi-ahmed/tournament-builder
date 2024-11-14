<script setup>
import { useRoute } from "vue-router";

const route = useRoute();

definePage({
  name: "tournament-dashboard",
  meta: {
    requiresAuth: true,
    title: "Tournament Dashboard",
    layout: "tournament-dashboard",
  },
});

// const store = useStore();
// const route = useRoute();
// const router = useRouter();
//
// const tournament = computed(() => store.state.tournament.tournament);
//
// const fetchData = async () => {
//   return Promise.all([
//     store.dispatch("tournament/setTournament", {
//       tournamentId: route.params.tournamentId,
//     }),
//     store.dispatch("tournament/setParticipants", {
//       tournamentId: route.params.tournamentId,
//     }),
//   ]);
// };
//
// onMounted(async () => {
//   fetchData();
// });
</script>

<template>
  <!--  <v-container>-->
  <!--    <v-row>-->
  <!--      <v-col>-->
  <!--        <page-title-->
  <!--          :sub-title="tournament.name"-->
  <!--          justify="space-between"-->
  <!--          show-back-->
  <!--          title="Dashboard"-->
  <!--        >-->
  <!--        </page-title>-->
  <!--      </v-col>-->
  <!--    </v-row>-->

  <!--    <v-row justify="center">-->
  <!--      <v-col>-->
  <!--        <v-card-->
  <!--          :height="200"-->
  <!--          class="d-flex align-center"-->
  <!--          @click="-->
  <!--            router.push({-->
  <!--              name: 'team-edit',-->
  <!--            })-->
  <!--          "-->
  <!--        >-->
  <!--          <v-card-text class="text-center"><h2>Team</h2></v-card-text>-->
  <!--        </v-card>-->
  <!--      </v-col>-->
  <!--      <v-col>-->
  <!--        <v-card-->
  <!--          :height="200"-->
  <!--          class="d-flex align-center"-->
  <!--          @click="-->
  <!--            router.push({-->
  <!--              name: 'team-squad',-->
  <!--            })-->
  <!--          "-->
  <!--        >-->
  <!--          <v-card-text class="text-center"><h2>Add Member</h2></v-card-text>-->
  <!--        </v-card>-->
  <!--      </v-col>-->
  <!--      <v-col>-->
  <!--        <v-card-->
  <!--          :height="200"-->
  <!--          class="d-flex align-center"-->
  <!--          @click="-->
  <!--            router.push({-->
  <!--              name: 'tournament-join',-->
  <!--            })-->
  <!--          "-->
  <!--        >-->
  <!--          <v-card-text class="text-center"-->
  <!--            ><h2>Join Tournament</h2></v-card-text-->
  <!--          >-->
  <!--        </v-card>-->
  <!--      </v-col>-->
  <!--    </v-row>-->
  <!--  </v-container>-->
</template>

<style scoped></style>
