// Composables
import { createRouter, createWebHistory } from "vue-router";
import store from "@/store";

const routes = [
  {
    path: "/",
    component: import("@/layouts/default/Default.vue"),
    children: [
      {
        path: "signin",
        name: "signin",
        component: import("@/views/Signin.vue"),
        meta: {
          requiresNoAuth: true,
          title: "Signin",
        },
      },
      {
        path: "signout",
        name: "signout",
        component: import("@/views/Signout.vue"),
        meta: {
          requiresAuth: true,
        },
      },
      {
        path: "register/:role",
        name: "register",
        component: import("@/views/Register.vue"),
        meta: {
          requiresNoAuth: true,
          title: "Register",
        },
      },
      {
        path: "dashboard/sudo",
        name: "dashboard-sudo",
        component: () => import("@/views/DashboardSudo.vue"),
        meta: {
          requiresSudo: true,
          title: "Dashboard Sudo",
        },
      },
      {
        path: "dashboard/organizer",
        name: "dashboard-organizer",
        component: () => import("@/views/DashboardOrganizer.vue"),
        meta: {
          requiresOrganizer: true,
          title: "Dashboard Organizer",
        },
      },
      {
        path: "dashboard/manager",
        name: "dashboard-manager",
        component: () => import("@/views/DashboardManager.vue"),
        meta: {
          requiresManager: true,
          title: "Dashboard Manager",
        },
      },
      {
        path: "dashboard",
        name: "dashboard",
        redirect: () => store.getters["user/calcHome"],
        meta: {
          requiresAuth: true,
        },
      },
      {
        path: "team/add",
        name: "team-add",
        component: () => import("@/views/TeamAdd.vue"),
        meta: {
          requiresAuth: true,
          title: "Add Team",
        },
      },
      {
        path: "team/list",
        name: "team-list",
        component: () => import("@/views/TeamList.vue"),
        meta: {
          requiresAuth: true,
          title: "Team List",
        },
      },
      {
        path: "tournament/add",
        name: "tournament-add",
        component: () => import("@/views/TournamentAdd.vue"),
        meta: {
          requiresAuth: true,
          title: "Add Tournament",
        },
      },
      {
        path: "tournament/edit/:tournamentId?",
        name: "tournament-edit",
        component: () => import("@/views/TournamentEdit.vue"),
        meta: {
          requiresAuth: true,
          title: "Edit Tournament",
        },
      },
      {
        path: "tournament/list",
        name: "tournament-list",
        component: () => import("@/views/TournamentList.vue"),
        meta: {
          requiresAuth: true,
          title: "Tournament List",
        },
      },
      {
        path: "team/edit/:teamId?",
        name: "team-edit",
        component: () => import("@/views/TeamEdit.vue"),
        meta: {
          requiresAuth: true,
          title: "Edit Team",
        },
      },
      {
        path: "team/squad/:teamId?",
        name: "team-squad",
        component: () => import("@/views/TeamSquad.vue"),
        meta: {
          requiresAuth: true,
          title: "Team Squad",
        },
      },
      {
        path: "credential",
        name: "credential",
        component: () => import("@/views/Credential.vue"),
        meta: {
          requiresSudo: true,
          title: "Credentials",
        },
      },
    ],
  },
  {
    path: "",
    redirect: { name: "signin" },
  },
  {
    path: "/not-found/:status?/:message?",
    name: "not-found",
    component: () => import("@/views/NotFound.vue"),
    props: (route) => ({
      status: route.params.status || 404,
      message: route.params.message || "Looks like you're lost!",
    }),
    meta: {},
  },
  {
    path: "/:catchAll(.*)",
    redirect: {
      name: "not-found",
      params: { status: 404, message: "Looks like you're lost!" },
    },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
