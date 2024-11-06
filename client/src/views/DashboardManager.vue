<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import PageTitle from "@/components/PageTitle.vue";

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
      <v-col sm="6" lg="3">
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
      <v-col sm="6" lg="3">
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'team-squad',
            })
          "
        >
          <v-card-text class="text-center"><h2>Add Member</h2></v-card-text>
        </v-card>
      </v-col>
      <v-col sm="6" lg="3">
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
      <v-col sm="6" lg="3">
        <v-card
          :height="200"
          class="d-flex align-center"
          @click="
            router.push({
              name: 'match-updates',
            })
          "
        >
          <v-card-text class="text-center"
            ><h2>Matches</h2></v-card-text
          >
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>
