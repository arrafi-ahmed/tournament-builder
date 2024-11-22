<script setup>
import Logo from "@/components/Logo.vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { computed, ref } from "vue";
import { getClientPublicImgUrl, getToLink } from "@/others/util";
import { useDisplay } from "vuetify";
import UserAvatar from "@/components/UserAvatar.vue";

const store = useStore();
const { xs } = useDisplay();
const router = useRouter();

const signedin = computed(() => store.getters["user/signedin"]);
const currentUser = computed(() => store.getters["user/getCurrentUser"]);
const calcHome = computed(() => store.getters["user/calcHome"]);

const isSudo = computed(() => store.getters["user/isSudo"]);
const isOrganizer = computed(() => store.getters["user/isOrganizer"]);
const isTeamManager = computed(() => store.getters["user/isTeamManager"]);

const menuItemsSudo = [
  {
    title: "Credentials",
    to: { name: "credential" },
  },
  {
    title: "Create Team",
    to: { name: "team-add" },
  },
];
const menuItemsOrganizer = [
  { title: "Tournaments", to: { name: "tournament-list" } },
  {
    title: "Create Tournament",
    to: { name: "tournament-add" },
  },
  {
    title: "Team Requests",
    to: { name: "team-requests" },
  },
];
const menuItemsTeamManager = [
  { title: "Matches", to: { name: "match-updates" } },
  {
    title: "Team Squad",
    to: { name: "team-squad" },
  },
  { title: "Join Tournament", to: { name: "tournament-join" } },
  { title: "Edit Team", to: { name: "team-edit" } },
];
const menuItems = computed(() => {
  let items = [{ title: "Home", to: calcHome.value }];
  if (isSudo.value) {
    items = items.concat(menuItemsSudo);
  } else if (isOrganizer.value) {
    items = items.concat(menuItemsOrganizer);
  } else if (isTeamManager.value) {
    items = items.concat(menuItemsTeamManager);
  }
  return items;
});

const drawer = ref(false);

const getFirstName = computed(() => currentUser.value.name?.split(" ")[0]);
const getGreetings = computed(() => {
  const hour = new Date().getHours();
  return `Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}!`;
});
</script>

<template>
  <v-app-bar
    :order="1"
    class="px-2 px-md-5"
    color="grey-lighten-3"
    dense
    density="compact"
    flat
  >
    <logo
      :img-src="getClientPublicImgUrl('logo.png')"
      :title="true"
      :width="40"
      container-class="clickable"
      img-class="mx-auto"
      @click="router.push(calcHome)"
    ></logo>

    <template v-slot:append>
      <v-btn
        v-if="signedin"
        :size="xs ? 'small' : 'default'"
        icon
        rounded
        tile
      >
        <user-avatar
          :imgSrc="currentUser.image"
          @click-avatar="drawer = !drawer"
        ></user-avatar>
      </v-btn>
    </template>
  </v-app-bar>
  <v-navigation-drawer
    v-if="signedin"
    v-model="drawer"
    :width="200"
    location="end"
    temporary
  >
    <v-list>
      <v-list-item>
        <div class="d-flex justify-start align-center">
          <user-avatar
            :imgSrc="currentUser.image"
            @click-avatar="drawer = !drawer"
          ></user-avatar>
          <div class="ml-3">
            <small>
              {{ getGreetings }}
            </small>
            <div>
              {{ getFirstName }}
            </div>
          </div>
        </div>
      </v-list-item>
      <v-divider class="mt-2 mb-2"></v-divider>
      <v-list-item
        v-for="(item, index) in menuItems"
        :key="index"
        :to="getToLink(item)"
      >
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
    <template v-slot:append>
      <div class="ma-5">
        <v-btn
          :to="{ name: 'signout' }"
          block
          color="primary"
          prepend-icon="mdi-exit-to-app"
          >Signout
        </v-btn>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<style scoped></style>
